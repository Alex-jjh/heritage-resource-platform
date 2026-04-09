package com.heritage.platform.repository;

import com.heritage.platform.model.ReviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ReviewFeedbackRepository extends JpaRepository<ReviewFeedback, UUID> {
    
    
    List<ReviewFeedback> findByResourceIdOrderByCreatedAtDesc(UUID resourceId);

    
    /**
     * Dynamic Query:·
     * If reviewerId is null, check everyone; if there is a value, check this person.
     * If decision is null, check all statuses; if there is a value, check the specific status
     */

    @org.springframework.data.jpa.repository.Query("SELECT r FROM ReviewFeedback r WHERE " +
           "(:reviewerId IS NULL OR r.reviewer.id = :reviewerId) AND " +
           "(:decision IS NULL OR r.decision = :decision) " +
           "ORDER BY r.createdAt DESC")
    java.util.List<ReviewFeedback> searchReviewHistory(
            @org.springframework.data.repository.query.Param("reviewerId") java.util.UUID reviewerId, 
            @org.springframework.data.repository.query.Param("decision") String decision
    );
}