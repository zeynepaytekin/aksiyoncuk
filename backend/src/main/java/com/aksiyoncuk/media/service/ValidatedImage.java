package com.aksiyoncuk.media.service;

record ValidatedImage(byte[] bytes, String contentType, String filename, String extension) {}
