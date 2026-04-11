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
     * Dynamic Query:
     * If reviewerEmail is null, return everyone's review history.
     * If reviewerEmail has a value, return only that reviewer's records.
     * If decision is null, return all decisions.
     * If decision has a value, return only the matching decision type.
     */
    @org.springframework.data.jpa.repository.Query(
            "SELECT r FROM ReviewFeedback r WHERE " +
            "(:reviewerEmail IS NULL OR r.reviewer.email = :reviewerEmail) AND " +
            "(:decision IS NULL OR r.decision = :decision) " +
            "ORDER BY r.createdAt DESC"
    )
    java.util.List<ReviewFeedback> searchReviewHistory(
            @org.springframework.data.repository.query.Param("reviewerEmail") String reviewerEmail,
            @org.springframework.data.repository.query.Param("decision") String decision
    );
}