import type { ApiRequestOptions } from "@/services/api/apiClient";

type Json = Record<string, unknown>;
const now = "2026-09-18T14:30:00Z";
const me = { id: "demo-user", username: "maya.rivers", fullName: "Maya Rivers", professionalTitle: "Documentary Director", location: "Bucharest, Romania", followerCount: 1284, followingCount: 342, followedByCurrentUser: false };
const people = [
  { id: "user-noah", username: "noah.bennett", fullName: "Noah Bennett", professionalTitle: "Film Editor", location: "London, UK", followerCount: 842, followingCount: 316, followedByCurrentUser: true },
  { id: "user-olivia", username: "olivia.reed", fullName: "Olivia Reed", professionalTitle: "Independent Producer", location: "Berlin, Germany", followerCount: 1205, followingCount: 488, followedByCurrentUser: false },
  { id: "user-daniel", username: "daniel.foster", fullName: "Daniel Foster", professionalTitle: "Cinematographer", location: "Lisbon, Portugal", followerCount: 679, followingCount: 205, followedByCurrentUser: true },
];

let posts = [
  { id: "post-0", content: "Back from a week of field recording along the Danube. The smallest sounds—a ferry cable, reeds in wind, footsteps on a wooden pier—are becoming the spine of the new film.", createdAt: "2026-09-19T07:30:00Z", updatedAt: "2026-09-19T07:30:00Z", author: me, ownedByCurrentUser: true, commentCount: 1, likeCount: 36, likedByCurrentUser: false, media: [] },
  { id: "post-1", content: "Just wrapped the final sound mix for Tides Between Us. Grateful to everyone who helped this small coastal story find its voice. #IndependentFilm", createdAt: "2026-09-18T09:15:00Z", updatedAt: "2026-09-18T09:15:00Z", author: people[1], ownedByCurrentUser: false, commentCount: 2, likeCount: 47, likedByCurrentUser: true, media: [] },
  { id: "post-2", content: "Looking for a production designer for a two-day music video shoot in October. Bold color work and practical sets are a plus.", createdAt: "2026-09-17T16:40:00Z", updatedAt: "2026-09-17T16:40:00Z", author: people[0], ownedByCurrentUser: false, commentCount: 1, likeCount: 23, likedByCurrentUser: false, media: [] },
  { id: "post-3", content: "Sharing a few lessons from filming with natural light in the old quarter: scout at the exact shooting hour, embrace contrast, and always have a bounce nearby.", createdAt: "2026-09-16T11:05:00Z", updatedAt: "2026-09-16T11:05:00Z", author: people[2], ownedByCurrentUser: false, commentCount: 0, likeCount: 68, likedByCurrentUser: false, media: [] },
];
const comments = [
  { id: "comment-1", postId: "post-1", content: "The atmosphere in the teaser is beautiful. Congratulations to the whole team!", createdAt: "2026-09-18T10:00:00Z", updatedAt: "2026-09-18T10:00:00Z", author: people[0], ownedByCurrentUser: false },
  { id: "comment-2", postId: "post-1", content: "Cannot wait to see it at the festival.", createdAt: "2026-09-18T10:40:00Z", updatedAt: "2026-09-18T10:40:00Z", author: me, ownedByCurrentUser: true },
];
const works = [
  { id: "work-1", title: "Salt Lines", description: "A short documentary following three generations of salt harvesters on the Atlantic coast.", workType: "DOCUMENTARY", projectUrl: null, releaseYear: 2026, createdAt: now, updatedAt: now, owner: me, ownedByCurrentUser: true, media: [] },
  { id: "work-2", title: "After the Last Train", description: "Narrative short exploring chance encounters in a near-empty station.", workType: "SHORT_FILM", projectUrl: null, releaseYear: 2025, createdAt: now, updatedAt: now, owner: people[2], ownedByCurrentUser: false, media: [] },
];
const jobs = [
  { id: "job-1", title: "Assistant Editor — Documentary Feature", description: "Organize dailies, sync footage, and prepare assemblies for a character-led environmental documentary.", category: "PROFESSIONAL", workMode: "HYBRID", location: "Berlin, Germany", compensationType: "FIXED", compensationAmount: 3200, currency: "EUR", status: "OPEN", applicationDeadline: "2026-10-12", createdAt: now, updatedAt: now, owner: people[1], ownedByCurrentUser: false, applicationCount: 14 },
  { id: "job-2", title: "Cinematographer for Micro Short", description: "One-day exterior shoot. Seeking a collaborator comfortable with handheld natural-light work.", category: "AMATEUR", workMode: "ONSITE", location: "Bucharest, Romania", compensationType: "NEGOTIABLE", compensationAmount: null, currency: null, status: "OPEN", applicationDeadline: "2026-10-01", createdAt: now, updatedAt: now, owner: me, ownedByCurrentUser: true, applicationCount: 6 },
  { id: "job-3", title: "Festival Social Video Volunteer", description: "Capture and edit short vertical interviews during a three-day independent film festival.", category: "VOLUNTEER", workMode: "ONSITE", location: "Cluj-Napoca, Romania", compensationType: "UNPAID", compensationAmount: null, currency: null, status: "OPEN", applicationDeadline: "2026-09-29", createdAt: now, updatedAt: now, owner: people[0], ownedByCurrentUser: false, applicationCount: 9 },
];
const applications = [
  { id: "application-1", status: "SUBMITTED", coverLetter: "My documentary editing work focuses on character, rhythm, and careful archival organization. I would love to contribute to this feature.", appliedAt: "2026-09-18T12:30:00Z", updatedAt: "2026-09-18T12:30:00Z", withdrawnAt: null, reviewedAt: null, job: { id: "job-1", title: "Assistant Editor — Documentary Feature", status: "OPEN", owner: people[1] }, applicant: me, ownedByCurrentApplicant: true, manageableByCurrentJobOwner: false },
  { id: "application-2", status: "SUBMITTED", coverLetter: "I have experience shooting small crews and can bring a compact camera and lighting package.", appliedAt: "2026-09-19T08:10:00Z", updatedAt: "2026-09-19T08:10:00Z", withdrawnAt: null, reviewedAt: null, job: { id: "job-2", title: "Cinematographer for Micro Short", status: "OPEN", owner: me }, applicant: people[2], ownedByCurrentApplicant: false, manageableByCurrentJobOwner: true },
];
const categories = [
  { id: "cat-video", parentId: null, slug: "video-animation", name: "Video & Animation", description: "Film, editing, motion, and animation", displayOrder: 1, children: [] },
  { id: "cat-audio", parentId: null, slug: "music-audio", name: "Music & Audio", description: "Sound design, composition, and mixing", displayOrder: 2, children: [] },
];
const packages = (prefix: string) => [
  { id: `${prefix}-basic`, tier: "BASIC", name: "Starter", description: "A focused creative deliverable", priceAmount: 120, currencyCode: "EUR", deliveryDays: 4, revisionCount: 1, active: true, displayOrder: 1 },
  { id: `${prefix}-standard`, tier: "STANDARD", name: "Production", description: "Expanded scope and two revisions", priceAmount: 280, currencyCode: "EUR", deliveryDays: 7, revisionCount: 2, active: true, displayOrder: 2 },
  { id: `${prefix}-premium`, tier: "PREMIUM", name: "Complete", description: "Full-service creative package", priceAmount: 520, currencyCode: "EUR", deliveryDays: 10, revisionCount: 3, active: true, displayOrder: 3 },
];
const services = [
  { id: "service-1", slug: "cinematic-trailer-edit", title: "I will edit a cinematic trailer for your film", shortDescription: "Story-led trailer editing with sound design and two polished aspect ratios.", description: "I shape your strongest images into a clear, emotionally paced trailer. Includes editorial, sound design, titles, and delivery masters.", status: "PUBLISHED", languageCode: "en", category: categories[0], seller: { ...people[0], avatarUrl: null }, packages: packages("edit"), works: [], media: [], averageRating: 4.9, reviewCount: 31, orderCount: 46, isSaved: true, publishedAt: now, createdAt: now, updatedAt: now },
  { id: "service-2", slug: "original-film-score", title: "I will compose an original score for your short film", shortDescription: "Custom cinematic music recorded with a hybrid acoustic and electronic palette.", description: "Original themes, spotting session, stems, and a mastered score tailored to your film.", status: "PUBLISHED", languageCode: "en", category: categories[1], seller: { ...people[1], avatarUrl: null }, packages: packages("score"), works: [], media: [], averageRating: 4.8, reviewCount: 18, orderCount: 27, isSaved: false, publishedAt: now, createdAt: now, updatedAt: now },
  { id: "service-3", slug: "documentary-color-grade", title: "I will color grade your documentary", shortDescription: "Natural, cohesive color with careful skin tones and broadcast-ready exports.", description: "A collaborative grade designed to preserve texture and authenticity across mixed-camera footage.", status: "PUBLISHED", languageCode: "en", category: categories[0], seller: { ...people[2], avatarUrl: null }, packages: packages("grade"), works: [], media: [], averageRating: 5, reviewCount: 12, orderCount: 19, isSaved: false, publishedAt: now, createdAt: now, updatedAt: now },
];
const order = { id: "order-1", orderNumber: "DEMO-1042", serviceId: "service-1", serviceTitle: services[0].title, buyer: { ...me, avatarUrl: null }, seller: services[0].seller, status: "IN_PROGRESS", packageTier: "STANDARD", packageName: "Production", packageDescription: "Expanded scope and two revisions", priceAmount: 280, currencyCode: "EUR", deliveryDays: 7, includedRevisionCount: 2, usedRevisionCount: 0, buyerRequirements: "A 60-second trailer emphasizing the relationship between place and memory.", startedAt: "2026-09-17T09:00:00Z", deliveryDueAt: "2026-09-24T09:00:00Z", deliveredAt: null, completedAt: null, cancelledAt: null, deliveries: [], revisions: [], pendingCancellation: null, cancellationHistory: [], reviews: [], reviewEligible: false, createdAt: now, updatedAt: now };
const notifications = [
  { id: "notification-1", type: "POST_COMMENTED", entityType: "POST", entityId: "post-1", message: "Noah commented on your post.", targetUrl: "/posts/view?id=post-1", read: false, readAt: null, createdAt: "2026-09-19T08:20:00Z", actor: people[0] },
  { id: "notification-2", type: "FREELANCE_ORDER_STARTED", entityType: "FREELANCE_ORDER", entityId: "order-1", message: "Your trailer edit order is now in progress.", targetUrl: "/freelance/order?id=order-1", read: false, readAt: null, createdAt: "2026-09-18T14:10:00Z", actor: people[0] },
  { id: "notification-3", type: "USER_FOLLOWED", entityType: "USER", entityId: "user-olivia", message: "Olivia Reed followed you.", targetUrl: "/profile?username=olivia.reed", read: true, readAt: now, createdAt: "2026-09-16T12:00:00Z", actor: people[1] },
];
const conversations = [
  { id: "conversation-1", type: "DIRECT", otherUser: people[0], latestMessage: { id: "message-2", content: "I’ll share the first trailer assembly on Thursday.", createdAt: "2026-09-19T10:05:00Z", sentByCurrentUser: false }, unreadCount: 1, createdAt: now, updatedAt: "2026-09-19T10:05:00Z" },
  { id: "conversation-2", type: "DIRECT", otherUser: people[2], latestMessage: { id: "message-3", content: "The location photos look perfect for the scene.", createdAt: "2026-09-18T16:45:00Z", sentByCurrentUser: true }, unreadCount: 0, createdAt: now, updatedAt: "2026-09-18T16:45:00Z" },
];
const messages = [
  { id: "message-1", conversationId: "conversation-1", content: "The selects and music references are in the brief.", createdAt: "2026-09-19T09:40:00Z", sentByCurrentUser: true, sender: me },
  { id: "message-2", conversationId: "conversation-1", content: "I’ll share the first trailer assembly on Thursday.", createdAt: "2026-09-19T10:05:00Z", sentByCurrentUser: false, sender: people[0] },
  { id: "message-3", conversationId: "conversation-2", content: "The location photos look perfect for the scene.", createdAt: "2026-09-18T16:45:00Z", sentByCurrentUser: true, sender: me },
];

function page<T>(content: T[], url: URL) {
  const pageNumber = Number(url.searchParams.get("page") ?? 0);
  const size = Number(url.searchParams.get("size") ?? 20);
  const slice = content.slice(pageNumber * size, (pageNumber + 1) * size);
  return { content: slice, page: pageNumber, size, totalElements: content.length, totalPages: Math.max(1, Math.ceil(content.length / size)), first: pageNumber === 0, last: (pageNumber + 1) * size >= content.length };
}
function summary(service: (typeof services)[number]) {
  return { ...service, thumbnailUrl: null, lowestPrice: service.packages[0].priceAmount, currencyCode: "EUR", shortestDeliveryDays: service.packages[0].deliveryDays };
}
function body(options: ApiRequestOptions): Json { return (options.body ?? {}) as Json; }
function matchText(value: unknown, q: string) { return String(value ?? "").toLowerCase().includes(q); }

export async function demoRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  await Promise.resolve();
  const method = (options.method ?? "GET").toUpperCase();
  const url = new URL(path, "https://demo.invalid");
  const p = url.pathname;
  let result: unknown;

  if (p === "/auth/logout") result = undefined;
  else if (p === "/auth/login" || p === "/auth/refresh") result = { accessToken: "demo-session-token-not-a-jwt", accessTokenExpiresAt: "2099-01-01T00:00:00Z", refreshToken: "demo-refresh-marker", refreshTokenExpiresAt: "2099-01-01T00:00:00Z", tokenType: "Bearer", user: { ...me, email: "visitor@example.invalid", status: "ACTIVE" } };
  else if (p === "/auth/me") result = { ...me, email: "visitor@example.invalid", status: "ACTIVE" };
  else if (p === "/profiles/me") result = { id: "profile-demo", user: { ...me, email: "visitor@example.invalid", status: "ACTIVE", createdAt: now }, bio: "Documentary filmmaker exploring memory, place, and everyday craft.", location: "Bucharest, Romania", websiteUrl: null, createdAt: now, updatedAt: now, followerCount: 1284, followingCount: 342, followedByCurrentUser: false, avatarUrl: null, coverUrl: null };
  else if (p.startsWith("/profiles/")) { const username = decodeURIComponent(p.split("/")[2]); const person = people.find(x => x.username === username) ?? people[0]; result = { ...person, userId: person.id, status: "ACTIVE", bio: "Creative professional working across independent film and visual storytelling.", websiteUrl: null, createdAt: now, updatedAt: now, avatarUrl: null, coverUrl: null }; }
  else if (p === "/posts" && method === "POST") { const created = { id: `post-demo-${Date.now()}`, content: String(body(options).content ?? ""), createdAt: now, updatedAt: now, author: me, ownedByCurrentUser: true, commentCount: 0, likeCount: 0, likedByCurrentUser: false, media: [] }; posts = [created, ...posts]; result = created; }
  else if (p === "/posts" || p === "/posts/me") result = page(p.endsWith("/me") ? posts.filter(x => x.ownedByCurrentUser) : posts, url);
  else if (/^\/posts\/[^/]+\/like$/.test(p)) { const item = posts.find(x => x.id === p.split("/")[2])!; item.likedByCurrentUser = method === "PUT"; item.likeCount += method === "PUT" ? 1 : -1; result = { postId: item.id, likedByCurrentUser: item.likedByCurrentUser, likeCount: item.likeCount }; }
  else if (/^\/posts\/[^/]+\/comments$/.test(p)) { const postId = p.split("/")[2]; if (method === "POST") { const created = { id: `comment-demo-${Date.now()}`, postId, content: String(body(options).content), createdAt: now, updatedAt: now, author: me, ownedByCurrentUser: true }; comments.push(created); const post = posts.find(x => x.id === postId); if (post) post.commentCount++; result = created; } else result = page(comments.filter(x => x.postId === postId), url); }
  else if (/^\/posts\/[^/]+$/.test(p)) result = posts.find(x => x.id === p.split("/")[2]);
  else if (p === "/works/me") result = page(works.filter(x => x.ownedByCurrentUser), url);
  else if (/^\/users\/[^/]+\/works$/.test(p)) result = page(works, url);
  else if (/^\/works\/[^/]+$/.test(p)) result = works.find(x => x.id === p.split("/")[2]);
  else if (p === "/jobs" || p === "/jobs/me") { let filtered = p.endsWith("/me") ? jobs.filter(x => x.ownedByCurrentUser) : jobs; for (const key of ["status", "category", "workMode"] as const) { const value = url.searchParams.get(key); if (value) filtered = filtered.filter(x => x[key] === value); } result = page(filtered, url); }
  else if (/^\/jobs\/[^/]+$/.test(p)) result = jobs.find(x => x.id === p.split("/")[2]);
  else if (p === "/network/me") result = { followerCount: 1284, followingCount: 342, mutualCount: 96 };
  else if (/^\/users\/[^/]+\/(followers|following)$/.test(p)) result = page(people, url);
  else if (/^\/users\/[^/]+\/follow$/.test(p)) { const username = decodeURIComponent(p.split("/")[2]); const person = people.find(x => x.username === username) ?? people[0]; person.followedByCurrentUser = method === "PUT"; result = { userId: person.id, username, followedByCurrentUser: person.followedByCurrentUser, followerCount: person.followerCount + (person.followedByCurrentUser ? 1 : 0), followingCount: person.followingCount }; }
  else if (p === "/notifications/summary") result = { unreadCount: notifications.filter(x => !x.read).length };
  else if (p === "/notifications/read-all") { notifications.forEach(x => { x.read = true; x.readAt = now; }); result = { unreadCount: 0 }; }
  else if (/^\/notifications\/[^/]+\/(read|unread)$/.test(p)) { const [,, id, action] = p.split("/"); const item = notifications.find(x => x.id === id)!; item.read = action === "read"; item.readAt = item.read ? now : null; result = item; }
  else if (p === "/notifications") { let filtered = notifications; if (url.searchParams.get("unreadOnly") === "true") filtered = filtered.filter(x => !x.read); result = page(filtered, url); }
  else if (p === "/messaging/summary") result = { unreadConversationCount: conversations.filter(x => x.unreadCount > 0).length, unreadMessageCount: conversations.reduce((n, x) => n + x.unreadCount, 0) };
  else if (p === "/conversations") result = page(conversations, url);
  else if (/^\/conversations\/[^/]+\/messages$/.test(p)) { const conversationId = p.split("/")[2]; if (method === "POST") { const created = { id: `message-demo-${Date.now()}`, conversationId, content: String(body(options).content), createdAt: new Date().toISOString(), sentByCurrentUser: true, sender: me }; messages.push(created); result = created; } else result = page(messages.filter(x => x.conversationId === conversationId), url); }
  else if (/^\/conversations\/[^/]+\/read$/.test(p)) { const item = conversations.find(x => x.id === p.split("/")[2])!; item.unreadCount = 0; result = item; }
  else if (/^\/conversations\/[^/]+$/.test(p)) result = conversations.find(x => x.id === p.split("/")[2]);
  else if (p === "/freelance/categories") result = categories;
  else if (p === "/freelance/services") result = page(services.map(summary), url);
  else if (p === "/freelance/me/saved-services") result = page(services.filter(x => x.isSaved).map(summary), url);
  else if (p === "/freelance/services/mine") result = page([], url);
  else if (/^\/freelance\/services\/[^/]+\/saved$/.test(p)) { const item = services.find(x => x.id === p.split("/")[3])!; if (method === "PUT") item.isSaved = true; if (method === "DELETE") item.isSaved = false; result = { saved: item.isSaved }; }
  else if (/^\/freelance\/services\/[^/]+\/reviews$/.test(p)) result = page([{ id: "review-1", orderId: "order-old", serviceId: p.split("/")[3], serviceTitle: "Creative service", reviewer: { ...people[1], avatarUrl: null }, reviewee: { ...people[0], avatarUrl: null }, reviewerRole: "BUYER", rating: 5, comment: "Thoughtful communication and a beautifully polished result.", createdAt: now }], url);
  else if (/^\/freelance\/services\/[^/]+$/.test(p)) result = services.find(x => x.id === p.split("/")[3]);
  else if (p === "/freelance/orders/buying" || p === "/freelance/orders/selling") result = page([order], url);
  else if (/^\/freelance\/orders\/[^/]+\/reviews$/.test(p)) result = order.reviews;
  else if (/^\/freelance\/orders\/[^/]+$/.test(p)) result = order;
  else if (p.startsWith("/search")) { const q = (url.searchParams.get("q") ?? "").toLowerCase(); const users = people.filter(x => matchText(x.fullName, q) || matchText(x.professionalTitle, q)); const foundPosts = posts.filter(x => matchText(x.content, q)); const foundWorks = works.filter(x => matchText(x.title, q)); const foundJobs = jobs.filter(x => matchText(x.title, q)); if (p === "/search/users") result = page(users, url); else if (p === "/search/posts") result = page(foundPosts, url); else if (p === "/search/works") result = page(foundWorks, url); else if (p === "/search/jobs") result = page(foundJobs, url); else result = { query: q, users: { content: users, totalElements: users.length }, posts: { content: foundPosts, totalElements: foundPosts.length }, works: { content: foundWorks, totalElements: foundWorks.length }, jobs: { content: foundJobs, totalElements: foundJobs.length } }; }
  else if (p === "/job-applications/me") result = page(applications.filter(x => x.ownedByCurrentApplicant), url);
  else if (/^\/jobs\/[^/]+\/applications$/.test(p)) result = page(applications.filter(x => x.job.id === p.split("/")[2]), url);
  else if (/^\/job-applications\/[^/]+$/.test(p)) result = applications.find(x => x.id === p.split("/")[2]);
  else result = undefined;
  return structuredClone(result) as T;
}
