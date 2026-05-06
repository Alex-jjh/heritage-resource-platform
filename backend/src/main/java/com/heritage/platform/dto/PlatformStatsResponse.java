package com.heritage.platform.dto;

public class PlatformStatsResponse {
    private long resourceCount;
    private long userCount;

    public PlatformStatsResponse(long resourceCount, long userCount) {
        this.resourceCount = resourceCount;
        this.userCount = userCount;
    }

    public long getResourceCount() {
        return resourceCount;
    }

    public void setResourceCount(long resourceCount) {
        this.resourceCount = resourceCount;
    }

    public long getUserCount() {
        return userCount;
    }

    public void setUserCount(long userCount) {
        this.userCount = userCount;
    }
}
