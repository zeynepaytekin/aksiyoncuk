package com.aksiyoncuk.freelance.service;

import static com.aksiyoncuk.freelance.dto.FreelanceDtos.*;

import com.aksiyoncuk.auth.security.AuthenticatedUser;
import com.aksiyoncuk.freelance.exception.FreelanceException;
import com.aksiyoncuk.media.service.MediaService;
import com.aksiyoncuk.messaging.dto.StartConversationRequest;
import com.aksiyoncuk.messaging.dto.StartConversationResult;
import com.aksiyoncuk.messaging.service.MessagingService;
import com.aksiyoncuk.notification.entity.NotificationType;
import com.aksiyoncuk.notification.service.NotificationService;
import com.aksiyoncuk.user.repository.UserRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Pattern;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FreelanceMarketplaceService {
  private static final Pattern LANGUAGE = Pattern.compile("[a-z]{2}(?:-[A-Z]{2})?");
  private static final Set<String> TIERS = Set.of("BASIC", "STANDARD", "PREMIUM");
  private static final Set<String> STATUSES =
      Set.of(
          "CREATED",
          "IN_PROGRESS",
          "DELIVERED",
          "REVISION_REQUESTED",
          "COMPLETED",
          "CANCELLATION_REQUESTED",
          "CANCELLED");
  private final JdbcTemplate jdbc;
  private final UserRepository users;
  private final NotificationService notifications;
  private final MessagingService messaging;
  private final MediaService media;

  public FreelanceMarketplaceService(
      JdbcTemplate jdbc,
      UserRepository users,
      NotificationService notifications,
      MessagingService messaging,
      MediaService media) {
    this.jdbc = jdbc;
    this.users = users;
    this.notifications = notifications;
    this.messaging = messaging;
    this.media = media;
  }

  @Transactional(readOnly = true)
  public List<Category> categories() {
    var rows =
        jdbc.query(
            """
            SELECT id,parent_id,slug,name,description,display_order
            FROM freelance_categories WHERE active ORDER BY display_order,id
            """,
            (rs, n) ->
                new Category(
                    uuid(rs, "id"),
                    uuid(rs, "parent_id"),
                    rs.getString("slug"),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getInt("display_order"),
                    List.of()));
    var children = rows.stream().filter(c -> c.parentId() != null).toList();
    return rows.stream()
        .filter(c -> c.parentId() == null)
        .map(
            c ->
                new Category(
                    c.id(),
                    null,
                    c.slug(),
                    c.name(),
                    c.description(),
                    c.displayOrder(),
                    children.stream().filter(x -> c.id().equals(x.parentId())).toList()))
        .toList();
  }

  @Transactional(readOnly = true)
  public Category category(String slug) {
    var normalized = required(slug, 1, 80, "FREELANCE_CATEGORY_NOT_FOUND", "Category is missing");
    return jdbc
        .query(
            """
            SELECT id,parent_id,slug,name,description,display_order
            FROM freelance_categories WHERE active AND slug=?
            """,
            categoryMapper(),
            normalized)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> notFound("FREELANCE_CATEGORY_NOT_FOUND", "Freelance category was not found"));
  }

  @Transactional
  public ServiceResponse create(AuthenticatedUser principal, ServiceRequest request) {
    validateService(request);
    requireActiveCategory(request.categoryId());
    var id = UUID.randomUUID();
    var slug = uniqueSlug(principal.userId(), slugify(request.title()), id);
    jdbc.update(
        """
        INSERT INTO freelance_services
        (id,seller_user_id,category_id,title,slug,short_description,description,status,language_code)
        VALUES (?,?,?,?,?,?,?,'DRAFT',?)
        """,
        id,
        principal.userId(),
        request.categoryId(),
        clean(request.title()),
        slug,
        clean(request.shortDescription()),
        clean(request.description()),
        optional(request.languageCode()));
    replacePackages(id, request.packages());
    if (request.workIds() != null) replaceWorks(id, principal.userId(), request.workIds());
    return service(id, principal.userId());
  }

  @Transactional
  public ServiceResponse update(UUID id, AuthenticatedUser principal, ServiceRequest request) {
    validateService(request);
    var row = lockService(id);
    owner(row.sellerId, principal.userId());
    editable(row.status);
    requireActiveCategory(request.categoryId());
    jdbc.update(
        """
        UPDATE freelance_services SET category_id=?,title=?,short_description=?,description=?,
        language_code=?,updated_at=current_timestamp,version=version+1 WHERE id=?
        """,
        request.categoryId(),
        clean(request.title()),
        clean(request.shortDescription()),
        clean(request.description()),
        optional(request.languageCode()),
        id);
    replacePackages(id, request.packages());
    if (request.workIds() != null) replaceWorks(id, principal.userId(), request.workIds());
    return service(id, principal.userId());
  }

  @Transactional
  public ServiceResponse publish(UUID id, AuthenticatedUser principal) {
    var row = lockService(id);
    owner(row.sellerId, principal.userId());
    editable(row.status);
    requireActiveCategory(row.categoryId);
    var packages =
        jdbc.queryForObject(
            "SELECT count(*) FROM freelance_service_packages WHERE service_id=? AND active",
            Integer.class,
            id);
    if (packages == null || packages < 1)
      throw conflict(
          "FREELANCE_SERVICE_NOT_PUBLISHABLE",
          "A published listing requires at least one active package");
    jdbc.update(
        """
        UPDATE freelance_services SET status='PUBLISHED',
        published_at=COALESCE(published_at,current_timestamp),updated_at=current_timestamp,
        version=version+1 WHERE id=?
        """,
        id);
    return service(id, principal.userId());
  }

  @Transactional
  public ServiceResponse pause(UUID id, AuthenticatedUser principal) {
    return status(id, principal, "PUBLISHED", "PAUSED");
  }

  @Transactional
  public ServiceResponse archive(UUID id, AuthenticatedUser principal) {
    var row = lockService(id);
    owner(row.sellerId, principal.userId());
    if ("ARCHIVED".equals(row.status))
      throw conflict("FREELANCE_SERVICE_NOT_EDITABLE", "Archived listings are immutable");
    jdbc.update(
        "UPDATE freelance_services SET status='ARCHIVED',updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    return service(id, principal.userId());
  }

  @Transactional(readOnly = true)
  public ServiceResponse detail(UUID id, AuthenticatedUser principal) {
    var viewer = principal == null ? null : principal.userId();
    return service(id, viewer);
  }

  @Transactional(readOnly = true)
  public Page<OwnedServiceSummary> mine(AuthenticatedUser principal, int page, int size) {
    pagination(page, size);
    return ownedServicePage(principal.userId(), page, size);
  }

  @Transactional(readOnly = true)
  public Page<ServiceSummary> search(
      String q,
      String category,
      String seller,
      BigDecimal minPrice,
      BigDecimal maxPrice,
      Integer deliveryDaysMax,
      BigDecimal minimumRating,
      String packageTier,
      int page,
      int size,
      String sort) {
    pagination(page, size);
    if (minPrice != null && minPrice.signum() < 0
        || maxPrice != null && maxPrice.signum() < 0
        || minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0
        || deliveryDaysMax != null && (deliveryDaysMax < 1 || deliveryDaysMax > 365)
        || minimumRating != null
            && (minimumRating.compareTo(BigDecimal.ONE) < 0
                || minimumRating.compareTo(BigDecimal.valueOf(5)) > 0))
      throw bad("FREELANCE_INVALID_FILTER", "Freelance search filter is invalid");
    var where = new StringBuilder("s.status='PUBLISHED'");
    var args = new ArrayList<Object>();
    if (q != null && !q.isBlank()) {
      where.append(
          " AND (lower(s.title) LIKE ? OR lower(s.short_description) LIKE ? OR lower(u.full_name) LIKE ? OR lower(c.name) LIKE ?)");
      var term = "%" + q.trim().toLowerCase(Locale.ROOT) + "%";
      args.addAll(List.of(term, term, term, term));
    }
    add(where, args, category, " AND c.slug=?");
    add(where, args, seller, " AND u.username=?");
    if (minPrice != null) {
      where.append(" AND stats.lowest_price>=?");
      args.add(minPrice);
    }
    if (maxPrice != null) {
      where.append(" AND stats.lowest_price<=?");
      args.add(maxPrice);
    }
    if (deliveryDaysMax != null) {
      where.append(" AND stats.shortest_delivery<=?");
      args.add(deliveryDaysMax);
    }
    if (minimumRating != null) {
      where.append(" AND COALESCE(s.average_rating,0)>=?");
      args.add(minimumRating);
    }
    if (packageTier != null && !packageTier.isBlank()) {
      var tier = packageTier.trim().toUpperCase(Locale.ROOT);
      if (!TIERS.contains(tier))
        throw bad("FREELANCE_INVALID_FILTER", "Package tier is unsupported");
      where.append(
          " AND EXISTS (SELECT 1 FROM freelance_service_packages fp WHERE fp.service_id=s.id AND fp.active AND fp.tier=?)");
      args.add(tier);
    }
    return searchPage(where.toString(), args, page, size, sort(sort));
  }

  @Transactional
  public OrderResponse createOrder(AuthenticatedUser principal, OrderCreateRequest request) {
    if (request == null || request.serviceId() == null || request.packageId() == null)
      throw bad("FREELANCE_PACKAGE_INVALID", "Service and package are required");
    var listing = lockService(request.serviceId());
    if (listing.sellerId.equals(principal.userId()))
      throw bad("FREELANCE_SELF_ORDER_NOT_ALLOWED", "You cannot order your own listing");
    if (!"PUBLISHED".equals(listing.status))
      throw conflict("FREELANCE_SERVICE_NOT_ORDERABLE", "Listing is not orderable");
    var packageRow =
        jdbc
            .query(
                """
                SELECT id,tier,name,description,price_amount,currency_code,delivery_days,revision_count
                FROM freelance_service_packages
                WHERE id=? AND service_id=? AND active FOR SHARE
                """,
                (rs, n) ->
                    new PackageRow(
                        uuid(rs, "id"),
                        rs.getString("tier"),
                        rs.getString("name"),
                        rs.getString("description"),
                        rs.getBigDecimal("price_amount"),
                        rs.getString("currency_code"),
                        rs.getInt("delivery_days"),
                        rs.getInt("revision_count")),
                request.packageId(),
                request.serviceId())
            .stream()
            .findFirst()
            .orElseThrow(
                () -> notFound("FREELANCE_PACKAGE_NOT_FOUND", "Active package was not found"));
    var requirements =
        required(
            request.requirements(),
            10,
            5000,
            "FREELANCE_PACKAGE_INVALID",
            "Requirements must contain 10 to 5000 characters");
    var id = UUID.randomUUID();
    var number =
        "AKS-FR-"
            + java.time.Year.now(java.time.ZoneOffset.UTC).getValue()
            + "-"
            + id.toString().replace("-", "").substring(0, 10).toUpperCase(Locale.ROOT);
    jdbc.update(
        """
        INSERT INTO freelance_orders
        (id,service_id,package_id,buyer_user_id,seller_user_id,order_number,status,
        package_tier,package_name,package_description,price_amount,currency_code,delivery_days,
        included_revision_count,buyer_requirements)
        VALUES (?,?,?,?,?,?,'CREATED',?,?,?,?,?,?,?,?)
        """,
        id,
        listing.id,
        packageRow.id,
        principal.userId(),
        listing.sellerId,
        number,
        packageRow.tier,
        packageRow.name,
        packageRow.description,
        packageRow.price,
        packageRow.currency,
        packageRow.deliveryDays,
        packageRow.revisions,
        requirements);
    notifyEvent(
        "freelance-order-created:" + id,
        principal.userId(),
        listing.sellerId,
        NotificationType.FREELANCE_ORDER_CREATED,
        id,
        "A new freelance order was created.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse start(UUID id, AuthenticatedUser principal) {
    var row = lockOrder(id);
    seller(row, principal.userId());
    requireState(row, "CREATED", "FREELANCE_ORDER_ALREADY_STARTED");
    var now = Instant.now();
    jdbc.update(
        """
        UPDATE freelance_orders SET status='IN_PROGRESS',started_at=?,delivery_due_at=?,
        updated_at=?,version=version+1 WHERE id=?
        """,
        Timestamp.from(now),
        Timestamp.from(now.plus(row.deliveryDays, ChronoUnit.DAYS)),
        Timestamp.from(now),
        id);
    notifyEvent(
        "freelance-order-started:" + id,
        row.sellerId,
        row.buyerId,
        NotificationType.FREELANCE_ORDER_STARTED,
        id,
        "Your freelance order has started.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse reject(UUID id, AuthenticatedUser principal, ReasonRequest request) {
    var row = lockOrder(id);
    seller(row, principal.userId());
    requireState(row, "CREATED", "FREELANCE_ORDER_STATE_CONFLICT");
    required(
        request == null ? null : request.reason(),
        10,
        2000,
        "FREELANCE_ORDER_STATE_CONFLICT",
        "A rejection reason is required");
    jdbc.update(
        "UPDATE freelance_orders SET status='CANCELLED',cancelled_at=current_timestamp,updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    notifyEvent(
        "freelance-order-rejected:" + id,
        row.sellerId,
        row.buyerId,
        NotificationType.FREELANCE_ORDER_REJECTED,
        id,
        "Your freelance order was rejected.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse deliver(UUID id, AuthenticatedUser principal, DeliveryRequest request) {
    var row = lockOrder(id);
    seller(row, principal.userId());
    requireState(row, "IN_PROGRESS", "FREELANCE_ORDER_NOT_DELIVERABLE");
    var message =
        required(
            request == null ? null : request.message(),
            10,
            5000,
            "FREELANCE_ORDER_NOT_DELIVERABLE",
            "Delivery message must contain 10 to 5000 characters");
    jdbc.update(
        "INSERT INTO freelance_order_deliveries(id,order_id,submitted_by_user_id,message) VALUES (?,?,?,?)",
        UUID.randomUUID(),
        id,
        principal.userId(),
        message);
    jdbc.update(
        "UPDATE freelance_orders SET status='DELIVERED',delivered_at=current_timestamp,updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    notifyEvent(
        "freelance-delivered:" + id + ":" + row.version,
        row.sellerId,
        row.buyerId,
        NotificationType.FREELANCE_ORDER_DELIVERED,
        id,
        "Your freelance order was delivered.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse requestRevision(
      UUID id, AuthenticatedUser principal, ReasonRequest request) {
    var row = lockOrder(id);
    buyer(row, principal.userId());
    requireState(row, "DELIVERED", "FREELANCE_REVISION_STATE_CONFLICT");
    if (row.usedRevisions >= row.includedRevisions)
      throw conflict("FREELANCE_REVISION_LIMIT_EXCEEDED", "Revision allowance is exhausted");
    var reason =
        required(
            request == null ? null : request.reason(),
            10,
            2000,
            "FREELANCE_REVISION_STATE_CONFLICT",
            "Revision reason must contain 10 to 2000 characters");
    var revisionId = UUID.randomUUID();
    jdbc.update(
        "INSERT INTO freelance_order_revision_requests(id,order_id,requested_by_user_id,reason,sequence_number) VALUES (?,?,?,?,?)",
        revisionId,
        id,
        principal.userId(),
        reason,
        row.usedRevisions + 1);
    jdbc.update(
        "UPDATE freelance_orders SET status='REVISION_REQUESTED',used_revision_count=used_revision_count+1,updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    notifyEvent(
        "freelance-revision:" + revisionId,
        row.buyerId,
        row.sellerId,
        NotificationType.FREELANCE_REVISION_REQUESTED,
        id,
        "A revision was requested.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse acknowledgeRevision(
      UUID orderId, UUID revisionId, AuthenticatedUser principal) {
    var row = lockOrder(orderId);
    seller(row, principal.userId());
    requireState(row, "REVISION_REQUESTED", "FREELANCE_REVISION_STATE_CONFLICT");
    var changed =
        jdbc.update(
            """
            UPDATE freelance_order_revision_requests SET acknowledged_at=current_timestamp
            WHERE id=? AND order_id=? AND acknowledged_at IS NULL
            """,
            revisionId,
            orderId);
    if (changed != 1)
      throw conflict("FREELANCE_REVISION_STATE_CONFLICT", "Revision is stale or unavailable");
    jdbc.update(
        "UPDATE freelance_orders SET status='IN_PROGRESS',updated_at=current_timestamp,version=version+1 WHERE id=?",
        orderId);
    notifyEvent(
        "freelance-revision-ack:" + revisionId,
        row.sellerId,
        row.buyerId,
        NotificationType.FREELANCE_REVISION_ACKNOWLEDGED,
        orderId,
        "Your revision request was acknowledged.");
    return order(orderId, principal.userId());
  }

  @Transactional
  public OrderResponse complete(UUID id, AuthenticatedUser principal) {
    var row = lockOrder(id);
    buyer(row, principal.userId());
    requireState(row, "DELIVERED", "FREELANCE_ORDER_STATE_CONFLICT");
    jdbc.update(
        "UPDATE freelance_orders SET status='COMPLETED',completed_at=current_timestamp,updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    jdbc.update(
        "UPDATE freelance_services SET order_count=order_count+1,updated_at=current_timestamp,version=version+1 WHERE id=?",
        row.serviceId);
    notifyEvent(
        "freelance-completed:" + id,
        row.buyerId,
        row.sellerId,
        NotificationType.FREELANCE_ORDER_COMPLETED,
        id,
        "A freelance order was completed.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse requestCancellation(
      UUID id, AuthenticatedUser principal, ReasonRequest request) {
    var row = lockOrder(id);
    party(row, principal.userId());
    if (!Set.of("CREATED", "IN_PROGRESS", "DELIVERED", "REVISION_REQUESTED").contains(row.status))
      throw conflict(
          "FREELANCE_CANCELLATION_STATE_CONFLICT",
          "Cancellation is unavailable in the current state");
    var reason =
        required(
            request == null ? null : request.reason(),
            10,
            2000,
            "FREELANCE_CANCELLATION_STATE_CONFLICT",
            "Cancellation reason must contain 10 to 2000 characters");
    var requestId = UUID.randomUUID();
    try {
      jdbc.update(
          """
          INSERT INTO freelance_order_cancellation_requests
          (id,order_id,requested_by_user_id,requested_role,reason,status,previous_order_status)
          VALUES (?,?,?,?,?,'PENDING',?)
          """,
          requestId,
          id,
          principal.userId(),
          row.buyerId.equals(principal.userId()) ? "BUYER" : "SELLER",
          reason,
          row.status);
    } catch (DataIntegrityViolationException exception) {
      throw conflict(
          "FREELANCE_CANCELLATION_ALREADY_PENDING", "A cancellation request is already pending");
    }
    jdbc.update(
        "UPDATE freelance_orders SET status='CANCELLATION_REQUESTED',updated_at=current_timestamp,version=version+1 WHERE id=?",
        id);
    var recipient = row.buyerId.equals(principal.userId()) ? row.sellerId : row.buyerId;
    notifyEvent(
        "freelance-cancellation:" + requestId,
        principal.userId(),
        recipient,
        NotificationType.FREELANCE_CANCELLATION_REQUESTED,
        id,
        "A cancellation was requested.");
    return order(id, principal.userId());
  }

  @Transactional
  public OrderResponse resolveCancellation(
      UUID orderId, UUID requestId, AuthenticatedUser principal, String action) {
    var row = lockOrder(orderId);
    party(row, principal.userId());
    var cancellation = pendingCancellation(orderId, requestId);
    if (cancellation.requesterId.equals(principal.userId()) && !"WITHDRAWN".equals(action))
      throw forbidden(
          "FREELANCE_ORDER_ACCESS_FORBIDDEN",
          "Only the other order party may resolve this request");
    if (!cancellation.requesterId.equals(principal.userId()) && "WITHDRAWN".equals(action))
      throw forbidden(
          "FREELANCE_ORDER_ACCESS_FORBIDDEN", "Only the requester may withdraw this request");
    var next = "ACCEPTED".equals(action) ? "CANCELLED" : cancellation.previousStatus;
    jdbc.update(
        """
        UPDATE freelance_order_cancellation_requests SET status=?,resolved_by_user_id=?,
        resolved_at=current_timestamp WHERE id=? AND status='PENDING'
        """,
        action,
        principal.userId(),
        requestId);
    jdbc.update(
        """
        UPDATE freelance_orders SET status=?,cancelled_at=CASE WHEN ?='CANCELLED'
        THEN current_timestamp ELSE cancelled_at END,updated_at=current_timestamp,version=version+1
        WHERE id=?
        """,
        next,
        next,
        orderId);
    if (!"WITHDRAWN".equals(action)) {
      var type =
          "ACCEPTED".equals(action)
              ? NotificationType.FREELANCE_CANCELLATION_ACCEPTED
              : NotificationType.FREELANCE_CANCELLATION_REJECTED;
      notifyEvent(
          "freelance-cancellation-" + action.toLowerCase(Locale.ROOT) + ":" + requestId,
          principal.userId(),
          cancellation.requesterId,
          type,
          orderId,
          "Your cancellation request was " + action.toLowerCase(Locale.ROOT) + ".");
    }
    return order(orderId, principal.userId());
  }

  @Transactional
  public ReviewResponse review(UUID orderId, AuthenticatedUser principal, ReviewRequest request) {
    var row = lockOrder(orderId);
    buyer(row, principal.userId());
    requireState(row, "COMPLETED", "FREELANCE_REVIEW_NOT_ALLOWED");
    if (request == null || request.rating() == null || request.rating() < 1 || request.rating() > 5)
      throw bad("FREELANCE_REVIEW_NOT_ALLOWED", "Rating must be between 1 and 5");
    var comment =
        request.comment() == null || request.comment().isBlank()
            ? null
            : required(
                request.comment(),
                1,
                2000,
                "FREELANCE_REVIEW_NOT_ALLOWED",
                "Review comment is too long");
    var id = UUID.randomUUID();
    try {
      jdbc.update(
          """
          INSERT INTO freelance_reviews
          (id,order_id,service_id,reviewer_user_id,reviewed_user_id,rating,comment)
          VALUES (?,?,?,?,?,?,?)
          """,
          id,
          orderId,
          row.serviceId,
          row.buyerId,
          row.sellerId,
          request.rating(),
          comment);
    } catch (DataIntegrityViolationException exception) {
      throw conflict("FREELANCE_REVIEW_ALREADY_EXISTS", "This order was already reviewed");
    }
    jdbc.update(
        """
        UPDATE freelance_services s SET review_count=x.count,
        average_rating=x.average,updated_at=current_timestamp,version=version+1
        FROM (SELECT count(*)::integer count,round(avg(rating)::numeric,2) average
              FROM freelance_reviews WHERE service_id=?) x WHERE s.id=?
        """,
        row.serviceId,
        row.serviceId);
    notifyEvent(
        "freelance-review:" + id,
        row.buyerId,
        row.sellerId,
        NotificationType.FREELANCE_REVIEW_RECEIVED,
        orderId,
        "You received a freelance review.");
    return reviewById(id);
  }

  @Transactional(readOnly = true)
  public Page<ReviewResponse> reviews(UUID serviceId, int page, int size) {
    pagination(page, size);
    var total =
        Optional.ofNullable(
                jdbc.queryForObject(
                    "SELECT count(*) FROM freelance_reviews WHERE service_id=?",
                    Long.class,
                    serviceId))
            .orElse(0L);
    var content =
        jdbc.query(
            """
            SELECT r.id,r.rating,r.comment,r.created_at,u.id user_id,u.username,u.full_name,
            p.professional_title
            FROM freelance_reviews r JOIN users u ON u.id=r.reviewer_user_id
            LEFT JOIN profiles p ON p.user_id=u.id WHERE r.service_id=?
            ORDER BY r.created_at DESC,r.id LIMIT ? OFFSET ?
            """,
            reviewMapper(),
            serviceId,
            size,
            page * size);
    return page(content, page, size, total);
  }

  @Transactional(readOnly = true)
  public OrderResponse order(UUID id, AuthenticatedUser principal) {
    return order(id, principal.userId());
  }

  @Transactional(readOnly = true)
  public Page<OrderResponse> orders(
      AuthenticatedUser principal, boolean buying, String status, int page, int size) {
    pagination(page, size);
    var args = new ArrayList<Object>();
    var where = new StringBuilder(buying ? "buyer_user_id=?" : "seller_user_id=?");
    args.add(principal.userId());
    if (status != null && !status.isBlank()) {
      var normalized = status.trim().toUpperCase(Locale.ROOT);
      if (!STATUSES.contains(normalized))
        throw bad("FREELANCE_INVALID_FILTER", "Order status is unsupported");
      where.append(" AND status=?");
      args.add(normalized);
    }
    var total =
        jdbc.queryForObject(
            "SELECT count(*) FROM freelance_orders WHERE " + where, Long.class, args.toArray());
    args.add(size);
    args.add(page * size);
    var ids =
        jdbc.queryForList(
            "SELECT id FROM freelance_orders WHERE "
                + where
                + " ORDER BY updated_at DESC,id LIMIT ? OFFSET ?",
            UUID.class,
            args.toArray());
    return page(
        ids.stream().map(id -> order(id, principal.userId())).toList(),
        page,
        size,
        total == null ? 0 : total);
  }

  public StartConversationResult conversation(UUID serviceId, AuthenticatedUser principal) {
    var listing = basicService(serviceId);
    if (!"PUBLISHED".equals(listing.status) && !listing.sellerId.equals(principal.userId()))
      throw notFound("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found");
    var seller =
        users
            .findById(listing.sellerId)
            .orElseThrow(
                () -> notFound("FREELANCE_SERVICE_NOT_FOUND", "Freelance seller was not found"));
    return messaging.start(principal, new StartConversationRequest(seller.getUsername()));
  }

  private ServiceResponse service(UUID id, UUID viewer) {
    var base = basicService(id);
    if (!"PUBLISHED".equals(base.status) && !base.sellerId.equals(viewer))
      throw notFound("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found");
    var category = categoryById(base.categoryId);
    var seller = user(base.sellerId);
    var packages =
        jdbc.query(
            """
            SELECT id,tier,name,description,price_amount,currency_code,delivery_days,
            revision_count,active,display_order FROM freelance_service_packages
            WHERE service_id=? ORDER BY display_order,id
            """,
            (rs, n) ->
                new PackageResponse(
                    uuid(rs, "id"),
                    rs.getString("tier"),
                    rs.getString("name"),
                    rs.getString("description"),
                    rs.getBigDecimal("price_amount"),
                    rs.getString("currency_code"),
                    rs.getInt("delivery_days"),
                    rs.getInt("revision_count"),
                    rs.getBoolean("active"),
                    rs.getInt("display_order")),
            id);
    var works =
        jdbc.query(
            """
            SELECT w.id,w.title,thumbnail.storage_key,sw.display_order
            FROM freelance_service_works sw
            JOIN works w ON w.id=sw.work_id
            LEFT JOIN LATERAL (
              SELECT a.storage_key FROM work_media wm
              JOIN media_assets a ON a.id=wm.media_asset_id
              WHERE wm.work_id=w.id AND a.status='ACTIVE'
              ORDER BY wm.display_order,wm.id LIMIT 1
            ) thumbnail ON true
            WHERE sw.service_id=?
            ORDER BY sw.display_order,sw.id
            """,
            (rs, n) ->
                new WorkReference(
                    uuid(rs, "id"),
                    rs.getString("title"),
                    media.publicUrl(rs.getString("storage_key")),
                    rs.getInt("display_order")),
            id);
    return new ServiceResponse(
        base.id,
        base.slug,
        base.title,
        base.shortDescription,
        base.description,
        base.status,
        base.language,
        category,
        seller,
        packages,
        works,
        media.freelanceItems(id).stream()
            .map(
                item ->
                    new MediaResponse(
                        item.id(), item.url(), item.contentType(), null, item.displayOrder()))
            .toList(),
        base.averageRating,
        base.reviewCount,
        base.orderCount,
        base.publishedAt,
        base.createdAt,
        base.updatedAt);
  }

  private Page<ServiceSummary> searchPage(
      String where, List<Object> parameters, int page, int size, String order) {
    var joins =
        """
         FROM freelance_services s
         JOIN users u ON u.id=s.seller_user_id
         LEFT JOIN profiles p ON p.user_id=u.id
         JOIN freelance_categories c ON c.id=s.category_id
         LEFT JOIN LATERAL (
           SELECT min(price_amount) lowest_price,min(delivery_days) shortest_delivery
           FROM freelance_service_packages WHERE service_id=s.id AND active
         ) stats ON true
         LEFT JOIN LATERAL (
           SELECT a.storage_key FROM freelance_service_media sm
           JOIN media_assets a ON a.id=sm.media_asset_id
           WHERE sm.service_id=s.id AND a.status='ACTIVE'
           ORDER BY sm.display_order,sm.id LIMIT 1
         ) thumbnail ON true
        """;
    var total =
        jdbc.queryForObject(
            "SELECT count(*) " + joins + " WHERE " + where, Long.class, parameters.toArray());
    var args = new ArrayList<>(parameters);
    args.add(size);
    args.add(page * size);
    var content =
        jdbc.query(
            """
            SELECT s.id,s.slug,s.title,s.short_description,s.average_rating,s.review_count,
            s.order_count,s.published_at,c.id category_id,c.parent_id,c.slug category_slug,
            c.name category_name,c.description category_description,c.display_order category_order,
            u.id seller_id,u.username,u.full_name,p.professional_title,
            stats.lowest_price,stats.shortest_delivery,thumbnail.storage_key
            """
                + joins
                + " WHERE "
                + where
                + " ORDER BY "
                + order
                + " LIMIT ? OFFSET ?",
            (rs, n) ->
                new ServiceSummary(
                    uuid(rs, "id"),
                    rs.getString("slug"),
                    rs.getString("title"),
                    rs.getString("short_description"),
                    new Category(
                        uuid(rs, "category_id"),
                        uuid(rs, "parent_id"),
                        rs.getString("category_slug"),
                        rs.getString("category_name"),
                        rs.getString("category_description"),
                        rs.getInt("category_order"),
                        List.of()),
                    new UserSummary(
                        uuid(rs, "seller_id"),
                        rs.getString("username"),
                        rs.getString("full_name"),
                        rs.getString("professional_title"),
                        null),
                    media.publicUrl(rs.getString("storage_key")),
                    rs.getBigDecimal("lowest_price"),
                    "TRY",
                    (Integer) rs.getObject("shortest_delivery"),
                    rs.getBigDecimal("average_rating"),
                    rs.getInt("review_count"),
                    rs.getInt("order_count"),
                    instant(rs, "published_at")),
            args.toArray());
    return page(content, page, size, total == null ? 0 : total);
  }

  private Page<OwnedServiceSummary> ownedServicePage(UUID sellerId, int page, int size) {
    var total =
        jdbc.queryForObject(
            "SELECT count(*) FROM freelance_services WHERE seller_user_id=?", Long.class, sellerId);
    var content =
        jdbc.query(
            """
            SELECT s.id,s.slug,s.title,s.status,s.average_rating,s.review_count,s.order_count,
            s.updated_at,s.published_at,c.id category_id,c.parent_id,c.slug category_slug,
            c.name category_name,c.description category_description,c.display_order category_order,
            stats.lowest_price,thumbnail.storage_key
            FROM freelance_services s
            JOIN freelance_categories c ON c.id=s.category_id
            LEFT JOIN LATERAL (
              SELECT min(price_amount) lowest_price
              FROM freelance_service_packages WHERE service_id=s.id AND active
            ) stats ON true
            LEFT JOIN LATERAL (
              SELECT a.storage_key FROM freelance_service_media sm
              JOIN media_assets a ON a.id=sm.media_asset_id
              WHERE sm.service_id=s.id AND a.status='ACTIVE'
              ORDER BY sm.display_order,sm.id LIMIT 1
            ) thumbnail ON true
            WHERE s.seller_user_id=?
            ORDER BY s.updated_at DESC,s.id
            LIMIT ? OFFSET ?
            """,
            (rs, n) ->
                new OwnedServiceSummary(
                    uuid(rs, "id"),
                    rs.getString("slug"),
                    rs.getString("title"),
                    rs.getString("status"),
                    media.publicUrl(rs.getString("storage_key")),
                    new Category(
                        uuid(rs, "category_id"),
                        uuid(rs, "parent_id"),
                        rs.getString("category_slug"),
                        rs.getString("category_name"),
                        rs.getString("category_description"),
                        rs.getInt("category_order"),
                        List.of()),
                    rs.getBigDecimal("lowest_price"),
                    "TRY",
                    rs.getBigDecimal("average_rating"),
                    rs.getInt("review_count"),
                    rs.getInt("order_count"),
                    instant(rs, "updated_at"),
                    instant(rs, "published_at")),
            sellerId,
            size,
            page * size);
    return page(content, page, size, total == null ? 0 : total);
  }

  private OrderResponse order(UUID id, UUID viewer) {
    var row = basicOrder(id);
    party(row, viewer);
    var deliveries =
        jdbc.query(
            "SELECT id,message,created_at FROM freelance_order_deliveries WHERE order_id=? ORDER BY created_at,id",
            (rs, n) ->
                new Delivery(uuid(rs, "id"), rs.getString("message"), instant(rs, "created_at")),
            id);
    var revisions =
        jdbc.query(
            """
            SELECT id,reason,sequence_number,acknowledged_at,created_at
            FROM freelance_order_revision_requests WHERE order_id=? ORDER BY sequence_number
            """,
            (rs, n) ->
                new Revision(
                    uuid(rs, "id"),
                    rs.getString("reason"),
                    rs.getInt("sequence_number"),
                    instant(rs, "acknowledged_at"),
                    instant(rs, "created_at")),
            id);
    var cancellationHistory =
        jdbc.query(
            """
            SELECT id,requested_role,reason,status,previous_order_status,
            CASE
              WHEN resolved_by_user_id=? THEN 'BUYER'
              WHEN resolved_by_user_id=? THEN 'SELLER'
              ELSE NULL
            END resolver_role,
            created_at,resolved_at
            FROM freelance_order_cancellation_requests
            WHERE order_id=? ORDER BY created_at,id
            """,
            (rs, n) ->
                new Cancellation(
                    uuid(rs, "id"),
                    rs.getString("requested_role"),
                    rs.getString("reason"),
                    rs.getString("status"),
                    rs.getString("previous_order_status"),
                    rs.getString("resolver_role"),
                    instant(rs, "created_at"),
                    instant(rs, "resolved_at")),
            row.buyerId,
            row.sellerId,
            id);
    var cancellation =
        cancellationHistory.stream()
            .filter(request -> "PENDING".equals(request.status()))
            .findFirst()
            .orElse(null);
    var reviewed =
        Boolean.TRUE.equals(
            jdbc.queryForObject(
                "SELECT EXISTS(SELECT 1 FROM freelance_reviews WHERE order_id=?)",
                Boolean.class,
                id));
    return new OrderResponse(
        row.id,
        row.number,
        row.serviceId,
        row.serviceTitle,
        user(row.buyerId),
        user(row.sellerId),
        row.status,
        row.packageTier,
        row.packageName,
        row.packageDescription,
        row.price,
        row.currency,
        row.deliveryDays,
        row.includedRevisions,
        row.usedRevisions,
        row.requirements,
        row.startedAt,
        row.dueAt,
        row.deliveredAt,
        row.completedAt,
        row.cancelledAt,
        deliveries,
        revisions,
        cancellation,
        cancellationHistory,
        "COMPLETED".equals(row.status) && row.buyerId.equals(viewer) && !reviewed,
        row.createdAt,
        row.updatedAt);
  }

  private void replacePackages(UUID serviceId, List<PackageRequest> requests) {
    if (requests == null || requests.isEmpty() || requests.size() > 3)
      throw bad("FREELANCE_PACKAGE_INVALID", "One to three packages are required");
    var tiers = new HashSet<String>();
    for (var request : requests) {
      validatePackage(request);
      if (!tiers.add(request.tier().trim().toUpperCase(Locale.ROOT)))
        throw bad("FREELANCE_PACKAGE_INVALID", "Package tiers must be unique");
    }
    jdbc.update("DELETE FROM freelance_service_packages WHERE service_id=?", serviceId);
    for (int i = 0; i < requests.size(); i++) {
      var p = requests.get(i);
      jdbc.update(
          """
          INSERT INTO freelance_service_packages
          (id,service_id,tier,name,description,price_amount,currency_code,delivery_days,
          revision_count,active,display_order) VALUES (?,?,?,?,?,?,?,?,?,?,?)
          """,
          UUID.randomUUID(),
          serviceId,
          p.tier().trim().toUpperCase(Locale.ROOT),
          clean(p.name()),
          clean(p.description()),
          p.priceAmount().setScale(2, RoundingMode.UNNECESSARY),
          p.currencyCode().trim().toUpperCase(Locale.ROOT),
          p.deliveryDays(),
          p.revisionCount(),
          p.active() == null || p.active(),
          i);
    }
  }

  private void replaceWorks(UUID serviceId, UUID sellerId, List<UUID> ids) {
    if (ids.size() > 6
        || ids.stream().anyMatch(Objects::isNull)
        || new HashSet<>(ids).size() != ids.size())
      throw bad("FREELANCE_WORK_LIMIT_EXCEEDED", "At most six unique works may be linked");
    if (!ids.isEmpty()) {
      var placeholders = String.join(",", Collections.nCopies(ids.size(), "?"));
      var args = new ArrayList<Object>(ids);
      args.add(sellerId);
      var owned =
          jdbc.queryForObject(
              "SELECT count(*) FROM works WHERE id IN (" + placeholders + ") AND owner_id=?",
              Long.class,
              args.toArray());
      if (owned == null || owned != ids.size())
        throw forbidden(
            "FREELANCE_WORK_NOT_OWNED", "Every referenced work must be owned by the seller");
    }
    jdbc.update("DELETE FROM freelance_service_works WHERE service_id=?", serviceId);
    for (int i = 0; i < ids.size(); i++)
      jdbc.update(
          "INSERT INTO freelance_service_works(id,service_id,work_id,display_order) VALUES (?,?,?,?)",
          UUID.randomUUID(),
          serviceId,
          ids.get(i),
          i);
  }

  private void validateService(ServiceRequest request) {
    if (request == null || request.categoryId() == null)
      throw bad("FREELANCE_CATEGORY_NOT_FOUND", "Category is required");
    required(
        request.title(),
        10,
        120,
        "FREELANCE_PACKAGE_INVALID",
        "Title must contain 10 to 120 characters");
    required(
        request.shortDescription(),
        20,
        300,
        "FREELANCE_PACKAGE_INVALID",
        "Short description must contain 20 to 300 characters");
    required(
        request.description(),
        50,
        10000,
        "FREELANCE_PACKAGE_INVALID",
        "Description must contain 50 to 10000 characters");
    if (request.languageCode() != null
        && !request.languageCode().isBlank()
        && !LANGUAGE.matcher(request.languageCode().trim()).matches())
      throw bad("FREELANCE_PACKAGE_INVALID", "Language code is invalid");
    if (request.packages() == null || request.packages().isEmpty())
      throw bad("FREELANCE_PACKAGE_INVALID", "At least one package is required");
    if (request.packages().size() > 3)
      throw bad("FREELANCE_PACKAGE_INVALID", "At most three packages are supported");
    var tiers = new HashSet<String>();
    for (var packageRequest : request.packages()) {
      validatePackage(packageRequest);
      if (!tiers.add(packageRequest.tier().trim().toUpperCase(Locale.ROOT)))
        throw bad("FREELANCE_PACKAGE_INVALID", "Package tiers must be unique");
    }
  }

  private void validatePackage(PackageRequest p) {
    if (p == null || p.tier() == null || !TIERS.contains(p.tier().trim().toUpperCase(Locale.ROOT)))
      throw bad("FREELANCE_PACKAGE_INVALID", "Package tier is invalid");
    required(p.name(), 1, 80, "FREELANCE_PACKAGE_INVALID", "Package name is invalid");
    required(
        p.description(), 1, 2000, "FREELANCE_PACKAGE_INVALID", "Package description is invalid");
    if (p.priceAmount() == null
        || p.priceAmount().signum() <= 0
        || p.priceAmount().scale() > 2
        || p.deliveryDays() == null
        || p.deliveryDays() < 1
        || p.deliveryDays() > 365
        || p.revisionCount() == null
        || p.revisionCount() < 0
        || p.revisionCount() > 100
        || p.currencyCode() == null
        || !"TRY".equals(p.currencyCode().trim().toUpperCase(Locale.ROOT)))
      throw bad(
          "FREELANCE_PACKAGE_INVALID",
          "Package price, currency, delivery or revisions are invalid");
  }

  private BasicService basicService(UUID id) {
    return jdbc
        .query(
            """
            SELECT id,seller_user_id,category_id,slug,title,short_description,description,status,
            language_code,average_rating,review_count,order_count,published_at,created_at,updated_at
            FROM freelance_services WHERE id=?
            """,
            serviceMapper(),
            id)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> notFound("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found"));
  }

  private BasicService lockService(UUID id) {
    return jdbc
        .query(
            """
            SELECT id,seller_user_id,category_id,slug,title,short_description,description,status,
            language_code,average_rating,review_count,order_count,published_at,created_at,updated_at
            FROM freelance_services WHERE id=? FOR UPDATE
            """,
            serviceMapper(),
            id)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> notFound("FREELANCE_SERVICE_NOT_FOUND", "Freelance service was not found"));
  }

  private BasicOrder basicOrder(UUID id) {
    return jdbc.query(ORDER_SELECT + " WHERE o.id=?", orderMapper(), id).stream()
        .findFirst()
        .orElseThrow(() -> notFound("FREELANCE_ORDER_NOT_FOUND", "Freelance order was not found"));
  }

  private BasicOrder lockOrder(UUID id) {
    return jdbc.query(ORDER_SELECT + " WHERE o.id=? FOR UPDATE OF o", orderMapper(), id).stream()
        .findFirst()
        .orElseThrow(() -> notFound("FREELANCE_ORDER_NOT_FOUND", "Freelance order was not found"));
  }

  private CancellationRow pendingCancellation(UUID orderId, UUID requestId) {
    return jdbc
        .query(
            """
            SELECT requested_by_user_id,previous_order_status FROM freelance_order_cancellation_requests
            WHERE id=? AND order_id=? AND status='PENDING' FOR UPDATE
            """,
            (rs, n) ->
                new CancellationRow(
                    uuid(rs, "requested_by_user_id"), rs.getString("previous_order_status")),
            requestId,
            orderId)
        .stream()
        .findFirst()
        .orElseThrow(
            () ->
                notFound("FREELANCE_CANCELLATION_NOT_FOUND", "Pending cancellation was not found"));
  }

  private ReviewResponse reviewById(UUID id) {
    return jdbc.query(
            """
            SELECT r.id,r.rating,r.comment,r.created_at,u.id user_id,u.username,u.full_name,
            p.professional_title FROM freelance_reviews r JOIN users u ON u.id=r.reviewer_user_id
            LEFT JOIN profiles p ON p.user_id=u.id WHERE r.id=?
            """,
            reviewMapper(),
            id)
        .getFirst();
  }

  private UserSummary user(UUID id) {
    return jdbc
        .query(
            """
            SELECT u.id,u.username,u.full_name,p.professional_title FROM users u
            LEFT JOIN profiles p ON p.user_id=u.id WHERE u.id=?
            """,
            (rs, n) ->
                new UserSummary(
                    uuid(rs, "id"),
                    rs.getString("username"),
                    rs.getString("full_name"),
                    rs.getString("professional_title"),
                    null),
            id)
        .stream()
        .findFirst()
        .orElseThrow(
            () -> notFound("FREELANCE_ORDER_NOT_FOUND", "Marketplace participant was not found"));
  }

  private Category categoryById(UUID id) {
    return jdbc.query(
            "SELECT id,parent_id,slug,name,description,display_order FROM freelance_categories WHERE id=?",
            categoryMapper(),
            id)
        .getFirst();
  }

  private void requireActiveCategory(UUID id) {
    if (!Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM freelance_categories WHERE id=? AND active)",
            Boolean.class,
            id))) throw notFound("FREELANCE_CATEGORY_INACTIVE", "Category is missing or inactive");
    var depth =
        jdbc.queryForObject(
            """
            SELECT EXISTS(
              SELECT 1 FROM freelance_categories child JOIN freelance_categories parent
              ON parent.id=child.parent_id WHERE child.id=? AND parent.parent_id IS NOT NULL)
            """,
            Boolean.class,
            id);
    if (Boolean.TRUE.equals(depth))
      throw bad("FREELANCE_CATEGORY_INACTIVE", "Only one category nesting level is supported");
  }

  private ServiceResponse status(
      UUID id, AuthenticatedUser principal, String expected, String target) {
    var row = lockService(id);
    owner(row.sellerId, principal.userId());
    if (!expected.equals(row.status))
      throw conflict("FREELANCE_SERVICE_NOT_EDITABLE", "Listing state transition is unavailable");
    jdbc.update(
        "UPDATE freelance_services SET status=?,updated_at=current_timestamp,version=version+1 WHERE id=?",
        target,
        id);
    return service(id, principal.userId());
  }

  private void notifyEvent(
      String key, UUID actorId, UUID recipientId, NotificationType type, UUID id, String message) {
    var actor = users.findById(actorId).orElseThrow();
    var recipient = users.findById(recipientId).orElseThrow();
    notifications.freelanceEvent(key, actor, recipient, type, id, message);
  }

  private String uniqueSlug(UUID seller, String base, UUID id) {
    var candidate = base;
    if (Boolean.TRUE.equals(
        jdbc.queryForObject(
            "SELECT EXISTS(SELECT 1 FROM freelance_services WHERE seller_user_id=? AND slug=?)",
            Boolean.class,
            seller,
            candidate))) candidate = base + "-" + id.toString().substring(0, 8);
    return candidate;
  }

  private String slugify(String value) {
    var normalized =
        java.text.Normalizer.normalize(clean(value), java.text.Normalizer.Form.NFD)
            .replaceAll("\\p{M}", "")
            .toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("(^-|-$)", "");
    return normalized.isBlank()
        ? "service"
        : normalized.substring(0, Math.min(120, normalized.length()));
  }

  private void pagination(int page, int size) {
    if (page < 0 || size < 1 || size > 50)
      throw bad(
          "FREELANCE_INVALID_PAGINATION", "Page must be at least 0 and size between 1 and 50");
  }

  private String sort(String value) {
    var normalized = value == null ? "NEWEST" : value.trim().toUpperCase(Locale.ROOT);
    return switch (normalized) {
      case "NEWEST" -> "s.published_at DESC,s.id";
      case "RATING_DESC" -> "s.average_rating DESC NULLS LAST,s.id";
      case "PRICE_ASC" -> "stats.lowest_price ASC NULLS LAST,s.id";
      case "PRICE_DESC" -> "stats.lowest_price DESC NULLS LAST,s.id";
      case "DELIVERY_ASC" -> "stats.shortest_delivery ASC NULLS LAST,s.id";
      case "POPULAR" -> "s.order_count DESC,s.review_count DESC,s.id";
      default -> throw bad("FREELANCE_INVALID_FILTER", "Freelance sort is unsupported");
    };
  }

  private static <T> Page<T> page(List<T> content, int page, int size, long total) {
    var pages = total == 0 ? 0 : (int) ((total + size - 1) / size);
    return new Page<>(content, page, size, total, pages, page == 0, page + 1 >= pages);
  }

  private static void add(StringBuilder where, List<Object> args, String value, String sql) {
    if (value != null && !value.isBlank()) {
      where.append(sql);
      args.add(value.trim().toLowerCase(Locale.ROOT));
    }
  }

  private static String required(String value, int min, int max, String code, String message) {
    var result = clean(value);
    if (result.length() < min || result.length() > max) throw bad(code, message);
    return result;
  }

  private static String clean(String value) {
    return value == null ? "" : value.strip();
  }

  private static String optional(String value) {
    return value == null || value.isBlank() ? null : value.strip();
  }

  private static void editable(String status) {
    if ("ARCHIVED".equals(status))
      throw conflict("FREELANCE_SERVICE_NOT_EDITABLE", "Archived listings are immutable");
  }

  private static void owner(UUID owner, UUID actor) {
    if (!owner.equals(actor))
      throw forbidden("FREELANCE_SERVICE_ACCESS_FORBIDDEN", "You do not own this listing");
  }

  private static void party(BasicOrder row, UUID actor) {
    if (!row.buyerId.equals(actor) && !row.sellerId.equals(actor))
      throw forbidden("FREELANCE_ORDER_ACCESS_FORBIDDEN", "Order access is forbidden");
  }

  private static void buyer(BasicOrder row, UUID actor) {
    if (!row.buyerId.equals(actor))
      throw forbidden("FREELANCE_ORDER_ACCESS_FORBIDDEN", "Buyer action is forbidden");
  }

  private static void seller(BasicOrder row, UUID actor) {
    if (!row.sellerId.equals(actor))
      throw forbidden("FREELANCE_ORDER_ACCESS_FORBIDDEN", "Seller action is forbidden");
  }

  private static void requireState(BasicOrder row, String expected, String code) {
    if (!expected.equals(row.status)) throw conflict(code, "Order state transition is unavailable");
  }

  private static FreelanceException bad(String code, String message) {
    return new FreelanceException(HttpStatus.BAD_REQUEST, code, message);
  }

  private static FreelanceException forbidden(String code, String message) {
    return new FreelanceException(HttpStatus.FORBIDDEN, code, message);
  }

  private static FreelanceException notFound(String code, String message) {
    return new FreelanceException(HttpStatus.NOT_FOUND, code, message);
  }

  private static FreelanceException conflict(String code, String message) {
    return new FreelanceException(HttpStatus.CONFLICT, code, message);
  }

  private static UUID uuid(ResultSet rs, String name) throws SQLException {
    return rs.getObject(name, UUID.class);
  }

  private static Instant instant(ResultSet rs, String name) throws SQLException {
    var timestamp = rs.getTimestamp(name);
    return timestamp == null ? null : timestamp.toInstant();
  }

  private static RowMapper<Category> categoryMapper() {
    return (rs, n) ->
        new Category(
            uuid(rs, "id"),
            uuid(rs, "parent_id"),
            rs.getString("slug"),
            rs.getString("name"),
            rs.getString("description"),
            rs.getInt("display_order"),
            List.of());
  }

  private static RowMapper<BasicService> serviceMapper() {
    return (rs, n) ->
        new BasicService(
            uuid(rs, "id"),
            uuid(rs, "seller_user_id"),
            uuid(rs, "category_id"),
            rs.getString("slug"),
            rs.getString("title"),
            rs.getString("short_description"),
            rs.getString("description"),
            rs.getString("status"),
            rs.getString("language_code"),
            rs.getBigDecimal("average_rating"),
            rs.getInt("review_count"),
            rs.getInt("order_count"),
            instant(rs, "published_at"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"));
  }

  private static RowMapper<BasicOrder> orderMapper() {
    return (rs, n) ->
        new BasicOrder(
            uuid(rs, "id"),
            rs.getString("order_number"),
            uuid(rs, "service_id"),
            rs.getString("service_title"),
            uuid(rs, "buyer_user_id"),
            uuid(rs, "seller_user_id"),
            rs.getString("status"),
            rs.getString("package_tier"),
            rs.getString("package_name"),
            rs.getString("package_description"),
            rs.getBigDecimal("price_amount"),
            rs.getString("currency_code"),
            rs.getInt("delivery_days"),
            rs.getInt("included_revision_count"),
            rs.getInt("used_revision_count"),
            rs.getString("buyer_requirements"),
            instant(rs, "started_at"),
            instant(rs, "delivery_due_at"),
            instant(rs, "delivered_at"),
            instant(rs, "completed_at"),
            instant(rs, "cancelled_at"),
            instant(rs, "created_at"),
            instant(rs, "updated_at"),
            rs.getLong("version"));
  }

  private static RowMapper<ReviewResponse> reviewMapper() {
    return (rs, n) ->
        new ReviewResponse(
            uuid(rs, "id"),
            new UserSummary(
                uuid(rs, "user_id"),
                rs.getString("username"),
                rs.getString("full_name"),
                rs.getString("professional_title"),
                null),
            rs.getInt("rating"),
            rs.getString("comment"),
            instant(rs, "created_at"));
  }

  private static final String ORDER_SELECT =
      """
      SELECT o.*,s.title service_title FROM freelance_orders o
      JOIN freelance_services s ON s.id=o.service_id
      """;

  private record BasicService(
      UUID id,
      UUID sellerId,
      UUID categoryId,
      String slug,
      String title,
      String shortDescription,
      String description,
      String status,
      String language,
      BigDecimal averageRating,
      int reviewCount,
      int orderCount,
      Instant publishedAt,
      Instant createdAt,
      Instant updatedAt) {}

  private record PackageRow(
      UUID id,
      String tier,
      String name,
      String description,
      BigDecimal price,
      String currency,
      int deliveryDays,
      int revisions) {}

  private record BasicOrder(
      UUID id,
      String number,
      UUID serviceId,
      String serviceTitle,
      UUID buyerId,
      UUID sellerId,
      String status,
      String packageTier,
      String packageName,
      String packageDescription,
      BigDecimal price,
      String currency,
      int deliveryDays,
      int includedRevisions,
      int usedRevisions,
      String requirements,
      Instant startedAt,
      Instant dueAt,
      Instant deliveredAt,
      Instant completedAt,
      Instant cancelledAt,
      Instant createdAt,
      Instant updatedAt,
      long version) {}

  private record CancellationRow(UUID requesterId, String previousStatus) {}
}
