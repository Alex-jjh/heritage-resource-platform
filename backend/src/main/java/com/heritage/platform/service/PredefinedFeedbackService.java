package com.heritage.platform.service;

import com.heritage.platform.dto.PredefinedFeedbackResponse;
import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;

@Service
public class PredefinedFeedbackService {

    public List<PredefinedFeedbackResponse> getPredefinedFeedbacks() {
        return Arrays.asList(
            new PredefinedFeedbackResponse("copyright", "Copyright Issue", "Copyright issue: Missing original source documentation or copyright holder's permission."),
            new PredefinedFeedbackResponse("fact_error", "Fact Error", "Fact error: The resource contains historically inaccurate dates, locations, or descriptions."),
            new PredefinedFeedbackResponse("low_quality", "Low Quality", "Poor image quality: The uploaded media files are too blurry or have insufficient resolution."),
            new PredefinedFeedbackResponse("irrelevant", "Irrelevant", "Irrelevant content: This resource does not align with the historical heritage categories of this platform."),
            new PredefinedFeedbackResponse("desc_needed", "More Desc", "Insufficient description: Please provide more background information to help users understand this resource.")
        );
    }
}