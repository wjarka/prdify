import type { SupabaseClient } from "../../db/supabase.client";
import type { Tables } from "../../db/database.types";
import { getPrdById } from "./prds";

/**
 * Custom error classes for PRD document operations
 */
export class PrdDocumentGenerationError extends Error {
  constructor(message = "Unable to generate PRD document") {
    super(message);
    this.name = "PrdDocumentGenerationError";
  }
}

export class PrdDocumentConflictError extends Error {
  constructor(message = "PRD status conflict for document operation") {
    super(message);
    this.name = "PrdDocumentConflictError";
  }
}

export class PrdDocumentUpdateError extends Error {
  constructor(message = "Unable to update PRD document") {
    super(message);
    this.name = "PrdDocumentUpdateError";
  }
}

/**
 * Updates the document content for a PRD in the database.
 * This is a shared helper function used by both generatePrdDocument and updatePrdDocument.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @param content - The new document content
 * @param additionalUpdates - Optional additional fields to update
 * @throws PrdDocumentUpdateError if database update fails
 */
async function updatePrdDocumentContent(
  supabase: SupabaseClient,
  prdId: string,
  content: string,
  additionalUpdates: Partial<Pick<Tables<"prds">, "status">> = {}
): Promise<void> {
  const { error } = await supabase
    .from("prds")
    .update({
      content,
      ...additionalUpdates,
    })
    .eq("id", prdId);

  if (error) {
    throw new PrdDocumentUpdateError(`Failed to update PRD document: ${error.message}`);
  }
}

/**
 * Generates the final PRD document content based on the approved summary.
 * Transitions the PRD status from 'planning_review' to 'prd_review'.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @returns Promise resolving to the generated document content string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdDocumentConflictError if PRD is not in planning_review status or has no summary
 * @throws PrdDocumentGenerationError if AI service fails or database update fails
 */
export async function generatePrdDocument(supabase: SupabaseClient, prdId: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "planning_review") {
    throw new PrdDocumentConflictError("PRD must be in planning_review status to generate document");
  }

  if (!prd.summary) {
    throw new PrdDocumentConflictError("Cannot generate document: PRD has no summary");
  }

  // Generate document using AI service (mocked for now)
  const content = await generateDocumentWithAI(prd.summary);

  // Update the PRD record with the document content and change status
  await updatePrdDocumentContent(supabase, prdId, content, { status: "prd_review" });

  return content;
}

/**
 * Updates the content of a generated PRD document. Only allowed when the PRD is in 'prd_review' status.
 *
 * @param supabase - The Supabase client instance
 * @param prdId - The unique identifier of the PRD
 * @param content - The new document content
 * @returns Promise resolving to the updated content string
 * @throws PrdNotFoundError if PRD doesn't exist
 * @throws PrdDocumentConflictError if PRD is not in prd_review status
 * @throws PrdDocumentUpdateError if database update fails
 */
export async function updatePrdDocument(supabase: SupabaseClient, prdId: string, content: string): Promise<string> {
  // Fetch the PRD and validate its status
  const prd = await getPrdById(supabase, prdId);

  if (prd.status !== "prd_review") {
    throw new PrdDocumentConflictError("PRD must be in prd_review status to update document");
  }

  // Update the document content in the database
  await updatePrdDocumentContent(supabase, prdId, content);

  return content;
}

/**
 * Mock AI service call for generating PRD document
 * TODO: Replace with actual AI service integration (OpenRouter.ai)
 */
async function generateDocumentWithAI(summary: string): Promise<string> {
  // Mock implementation - in real implementation, this would call OpenRouter.ai

  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Mock response - in real implementation, this would be the AI-generated document
  return `# Product Requirements Document (PRD)

## Executive Summary

${summary}

## 1. Introduction

### 1.1 Purpose
This Product Requirements Document (PRD) outlines the detailed requirements and specifications for the development of [Product Name]. This document serves as the authoritative source of requirements for all stakeholders involved in the product development lifecycle.

### 1.2 Scope
The scope of this PRD includes all functional and non-functional requirements necessary to deliver a complete, production-ready solution that addresses the identified business needs and user requirements.

## 2. Product Overview

### 2.1 Product Vision
[To be detailed based on the planning session insights]

### 2.2 Target Audience
[Based on planning session analysis]

### 2.3 Key Objectives
- Deliver a solution that meets all success criteria defined in the planning phase
- Ensure scalability and maintainability of the codebase
- Provide an intuitive and efficient user experience

## 3. Functional Requirements

### 3.1 Core Features
[To be detailed based on the comprehensive planning session]

### 3.2 User Workflows
[Defined through the Q&A clarification process]

## 4. Non-Functional Requirements

### 4.1 Performance
- Response times must be under 2 seconds for all user interactions
- System must support [X] concurrent users
- Database queries must complete within 500ms

### 4.2 Security
- All data transmission must use HTTPS/TLS 1.3 or higher
- User authentication and authorization must be implemented
- Sensitive data must be encrypted at rest and in transit

### 4.3 Usability
- Interface must be accessible and compliant with WCAG 2.1 AA standards
- User onboarding process must be intuitive and require minimal training

## 5. Technical Specifications

### 5.1 Architecture
[To be defined based on technical requirements identified during planning]

### 5.2 Technology Stack
- Frontend: [Specified technologies]
- Backend: [Specified technologies]
- Database: [Specified technologies]
- Infrastructure: [Specified technologies]

## 6. Implementation Plan

### 6.1 Development Phases
1. MVP Development (Weeks 1-4)
2. Feature Enhancement (Weeks 5-8)
3. Testing and QA (Weeks 9-10)
4. Deployment and Launch (Week 11)

### 6.2 Success Metrics
[Based on success criteria defined in planning phase]

## 7. Risks and Mitigations

### 7.1 Technical Risks
[Identified during planning session]

### 7.2 Business Risks
[Identified during planning session]

## 8. Acceptance Criteria

The product will be considered complete when:
- All functional requirements have been implemented and tested
- All non-functional requirements have been met
- User acceptance testing has been completed successfully
- Performance benchmarks have been achieved
- Security audit has been passed

## 9. Future Considerations

### 9.1 Potential Enhancements
[Based on insights from planning session]

### 9.2 Scalability Considerations
[Technical considerations for future growth]

---

*This PRD was generated based on the comprehensive planning session summary and represents the current understanding of project requirements. Further refinements may be necessary as implementation progresses.*`;
}
