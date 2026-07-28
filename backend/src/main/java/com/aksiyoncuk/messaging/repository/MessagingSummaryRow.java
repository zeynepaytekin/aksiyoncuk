package com.aksiyoncuk.messaging.repository;

public interface MessagingSummaryRow {
  long getUnreadConversationCount();

  long getUnreadMessageCount();
}
