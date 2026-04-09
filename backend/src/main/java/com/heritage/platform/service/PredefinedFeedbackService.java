package com.heritage.platform.service;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;

@Service
public class PredefinedFeedbackService {

    /**
     * 提供至少 5 个快捷回复标签
     */
    public List<String> getPredefinedFeedbacks() {
        return Arrays.asList(
            "Copyright issue",
            "Fact error",
            "Insufficient description",
            "Poor image quality",
            "Irrelevant content",
            "Violation of community guidelines"
        );
    }
}