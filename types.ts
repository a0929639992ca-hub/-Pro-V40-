import React from 'react';

export interface HandoverItem {
    id: number;
    bed: string;
    record: number; // 0: None, 1: Pending, 2: Done
    assess: number;
    observe: number;
    pain: number;
    reminder: string;
    reminderTime: string;
    alerted: boolean;
}

export interface ExamItem {
    id: number;
    bed: string;
    name: string;
    time: string;
    alerted: boolean;
}

export type ShiftType = 'A' | 'E' | 'N';

export interface ShiftSetting {
    label: string;
    checkTime: number;
    clockOutTime: number;
    clearTime: number;
    icon: React.ReactNode;
    color: string;
}

export interface TagItem {
    id: string;
    text: string;
    type?: string;
}

export interface NandaFocus {
    label: string;
    subjective_tags?: TagItem[];
    actions?: string[];
    responses?: string[];
    teachings?: string[];
    d_options?: string[]; // For specific focuses like sleep/falls
    d_templates?: string[]; // For admission
    reasons?: string[]; // For restraint
    d_template?: string; // For other symptoms like constipation
    sites?: string[]; // For injection sites
    types?: string[]; // For restraint type
    scopes?: string[]; // For restraint scope
}

export interface MseCategory {
    title: string;
    tags: TagItem[];
}

export interface RecordState {
    D: string;
    A: string;
    R: string;
    T: string;
}