package com.heritage.platform.repository;

import com.heritage.platform.model.FileReference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface FileReferenceRepository extends JpaRepository<FileReference, UUID> {
    List<FileReference> findByResourceId(UUID resourceId);
    int countByResourceId(UUID resourceId);
}
