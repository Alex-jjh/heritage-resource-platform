package com.heritage.platform.repository;

import com.heritage.platform.model.StatusTransition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface StatusTransitionRepository extends JpaRepository<StatusTransition, UUID> {
    List<StatusTransition> findByResourceIdOrderByTransitionedAtDesc(UUID resourceId);
}
