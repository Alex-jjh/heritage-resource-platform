package com.heritage.platform.model;

public enum FeaturedStatus {
    NONE,       // Default state: Not applied
    PENDING,    // In progress: Contributor has applied, waiting for administrator approval
    APPROVED,   // Passed: Resources will be displayed on the homepage
    REJECTED    // Rejected

}
