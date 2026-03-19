package com.heritage.platform.model;

import java.util.Map;
import java.util.Set;

public enum ResourceStatus {
    DRAFT,
    PENDING_REVIEW,
    APPROVED,
    REJECTED,
    ARCHIVED;

    private static final Map<ResourceStatus, Set<ResourceStatus>> ALLOWED_TRANSITIONS = Map.of(
        DRAFT, Set.of(PENDING_REVIEW),
        PENDING_REVIEW, Set.of(APPROVED, REJECTED),
        APPROVED, Set.of(ARCHIVED, DRAFT),
        REJECTED, Set.of(DRAFT),
        ARCHIVED, Set.of(APPROVED)
    );

    public boolean canTransitionTo(ResourceStatus target) {
        return ALLOWED_TRANSITIONS.getOrDefault(this, Set.of()).contains(target);
    }
}
