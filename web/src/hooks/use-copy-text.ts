"use client";

import { message } from "antd";
import copy from "copy-to-clipboard";

export function useCopyText() {
    return (value: string, successText = "已复制") => {
        copy(value);
        message.success(successText);
    };
}
