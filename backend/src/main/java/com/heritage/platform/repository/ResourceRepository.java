package com.heritage.platform.repository;

import com.heritage.platform.model.FeaturedStatus;
import com.heritage.platform.model.Resource;
import com.heritage.platform.model.ResourceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {

    List<Resource> findByContributorId(UUID contributorId);

    List<Resource> findByStatusOrderByCreatedAtAsc(ResourceStatus status);

    List<Resource> findByStatusOrderByApprovedAtDesc(ResourceStatus status);

    List<Resource> findByIsFeaturedTrueOrderByCreatedAtDesc();

    List<Resource> findByFeaturedStatus(FeaturedStatus status);

    List<Resource> findByFeaturedStatusOrderByCreatedAtDesc(FeaturedStatus status);

    @Query("""
           SELECT r FROM Resource r
           WHERE r.status = :status
             AND r.isFeatured = true
             AND r.featuredStatus = :featuredStatus
           ORDER BY r.approvedAt DESC, r.createdAt DESC
           """)
    List<Resource> findHomepageFeaturedResources(
            @Param("status") ResourceStatus status,
            @Param("featuredStatus") FeaturedStatus featuredStatus
    );

    @Query("SELECT r FROM Resource r WHERE r.status = :status AND "
            + "(r.title LIKE %:query% OR r.description LIKE %:query%)")
    Page<Resource> findByStatusAndTitleContainingOrDescriptionContaining(
            @Param("status") ResourceStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    Page<Resource> findByStatus(ResourceStatus status, Pageable pageable);

    Page<Resource> findByStatusAndCategoryId(
            ResourceStatus status,
            UUID categoryId,
            Pageable pageable
    );

    boolean existsByCategoryId(UUID categoryId);

    @Query("SELECT COUNT(r) > 0 FROM Resource r JOIN r.tags t WHERE t.id = :tagId")
    boolean existsByTagId(@Param("tagId") UUID tagId);

    @Query("SELECT DISTINCT r FROM Resource r LEFT JOIN r.tags t WHERE r.status = :status "
            + "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Resource> searchByTextQuery(
            @Param("status") ResourceStatus status,
            @Param("query") String query,
            Pageable pageable
    );

    @Query("SELECT DISTINCT r FROM Resource r JOIN r.tags t WHERE r.status = :status AND t.id = :tagId")
    Page<Resource> findByStatusAndTagId(
            @Param("status") ResourceStatus status,
            @Param("tagId") UUID tagId,
            Pageable pageable
    );

    @Query("SELECT DISTINCT r FROM Resource r LEFT JOIN r.tags t WHERE r.status = :status "
            + "AND r.category.id = :categoryId "
            + "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(t.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Resource> searchByTextQueryAndCategory(
            @Param("status") ResourceStatus status,
            @Param("query") String query,
            @Param("categoryId") UUID categoryId,
            Pageable pageable
    );

    @Query("SELECT DISTINCT r FROM Resource r JOIN r.tags t LEFT JOIN r.tags t2 WHERE r.status = :status "
            + "AND t.id = :tagId "
            + "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(t2.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Resource> searchByTextQueryAndTag(
            @Param("status") ResourceStatus status,
            @Param("query") String query,
            @Param("tagId") UUID tagId,
            Pageable pageable
    );

    @Query("SELECT DISTINCT r FROM Resource r JOIN r.tags t WHERE r.status = :status "
            + "AND r.category.id = :categoryId AND t.id = :tagId")
    Page<Resource> findByStatusAndCategoryIdAndTagId(
            @Param("status") ResourceStatus status,
            @Param("categoryId") UUID categoryId,
            @Param("tagId") UUID tagId,
            Pageable pageable
    );

    @Query("SELECT DISTINCT r FROM Resource r JOIN r.tags t LEFT JOIN r.tags t2 WHERE r.status = :status "
            + "AND r.category.id = :categoryId AND t.id = :tagId "
            + "AND (LOWER(r.title) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(r.description) LIKE LOWER(CONCAT('%', :query, '%')) "
            + "OR LOWER(t2.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Resource> searchByTextQueryAndCategoryAndTag(
            @Param("status") ResourceStatus status,
            @Param("query") String query,
            @Param("categoryId") UUID categoryId,
            @Param("tagId") UUID tagId,
            Pageable pageable
    );

    // Task allocation queries
    Resource findFirstByStatusAndLockedByIsNullOrderByReviewPriorityDescCreatedAtAsc(ResourceStatus status);
    
    List<Resource> findByStatusAndLockedById(ResourceStatus status, UUID lockedById);
    
    List<Resource> findByStatusAndLockedByIsNull(ResourceStatus status);
    
    List<Resource> findByStatusAndLockedAtBefore(ResourceStatus status, Instant lockedAt);
}
