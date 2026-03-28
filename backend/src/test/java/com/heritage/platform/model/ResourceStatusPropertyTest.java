package com.heritage.platform.model;

import net.jqwik.api.*;

import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based tests for the {@link ResourceStatus} state machine.
 *
 * <p>Uses jqwik to exhaustively verify the {@code canTransitionTo} method
 * against the canonical allowed-transitions map from the design document.
 *
 * <p>Key properties verified:
 * <ul>
 *   <li>Every valid (from, to) pair is accepted by {@code canTransitionTo}</li>
 *   <li>Every invalid (from, to) pair is rejected by {@code canTransitionTo}</li>
 * </ul>
 */
class ResourceStatusPropertyTest {

    // The canonical allowed transitions from the design document
    private static final Map<ResourceStatus, Set<ResourceStatus>> ALLOWED_TRANSITIONS = Map.of(
        ResourceStatus.DRAFT, Set.of(ResourceStatus.PENDING_REVIEW),
        ResourceStatus.PENDING_REVIEW, Set.of(ResourceStatus.APPROVED, ResourceStatus.REJECTED),
        ResourceStatus.APPROVED, Set.of(ResourceStatus.ARCHIVED, ResourceStatus.DRAFT),
        ResourceStatus.REJECTED, Set.of(ResourceStatus.DRAFT),
        ResourceStatus.ARCHIVED, Set.of()
    );

    @Property
    void validTransitionsAreAccepted(@ForAll("validTransitionPairs") Tuple.Tuple2<ResourceStatus, ResourceStatus> pair) {
        ResourceStatus from = pair.get1();
        ResourceStatus to = pair.get2();
        assertThat(from.canTransitionTo(to))
            .as("Transition from %s to %s should be allowed", from, to)
            .isTrue();
    }

    @Property
    void invalidTransitionsAreRejected(@ForAll("invalidTransitionPairs") Tuple.Tuple2<ResourceStatus, ResourceStatus> pair) {
        ResourceStatus from = pair.get1();
        ResourceStatus to = pair.get2();
        assertThat(from.canTransitionTo(to))
            .as("Transition from %s to %s should be rejected", from, to)
            .isFalse();
    }

    @Provide
    Arbitrary<Tuple.Tuple2<ResourceStatus, ResourceStatus>> validTransitionPairs() {
        return Arbitraries.of(
            ALLOWED_TRANSITIONS.entrySet().stream()
                .flatMap(entry -> entry.getValue().stream()
                    .map(to -> Tuple.of(entry.getKey(), to)))
                .toList()
        );
    }

    @Provide
    Arbitrary<Tuple.Tuple2<ResourceStatus, ResourceStatus>> invalidTransitionPairs() {
        Set<ResourceStatus> allStatuses = Set.of(ResourceStatus.values());
        return Arbitraries.of(
            allStatuses.stream()
                .flatMap(from -> allStatuses.stream()
                    .filter(to -> !ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to))
                    .map(to -> Tuple.of(from, to)))
                .toList()
        );
    }
}
