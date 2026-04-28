package com.heritage.platform.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PredefinedFeedbackResponse {
    private String key;     // 唯一标识，如 "copyright"
    private String label;   // 按钮上显示的字，如 "Copyright Issue"
    private String content; // 点开后自动填入文本框的长句子
}
