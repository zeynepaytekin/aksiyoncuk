package com.aksiyoncuk.network.repository;

import java.util.UUID;

public interface NetworkUserRow {
  UUID getId();

  String getUsername();

  String getFullName();

  String getProfessionalTitle();

  boolean getFollowedByCurrentUser();
}
