import type { TFunction } from "i18next";
import type { Attribute } from "./types";

const ATTRIBUTE_KEYS: Record<string, string> = {
  "First Name": "attrs.names.firstName",
  "Last Name": "attrs.names.lastName",
  Location: "attrs.names.location",
  "Personal Photo": "attrs.names.personalPhoto",
  "About Me": "attrs.names.aboutMe",
  "English Level": "attrs.names.englishLevel",
  "IELTS Score": "attrs.names.ieltsScore",
  GPA: "attrs.names.gpa",
  "Remote Work Availability": "attrs.names.remoteWork",
  "Presentation Skills": "attrs.names.presentationSkills",
  CAP: "attrs.names.cap",
  Python: "attrs.names.python",
  "Apache Hadoop": "attrs.names.apacheHadoop",
  "Available From": "attrs.names.availableFrom",
  "Last Employment": "attrs.names.lastEmployment",
};

const CATEGORY_KEYS: Record<string, string> = {
  "Personal Information": "attrs.categories.personalInformation",
  Certification: "attrs.categories.certification",
  "Domain Knowledge": "attrs.categories.domainKnowledge",
  "Soft Skills": "attrs.categories.softSkills",
  "Technical Skills": "attrs.categories.technicalSkills",
  Languages: "attrs.categories.languages",
};

const PLACEHOLDER_KEYS: Record<string, string> = {
  "First Name": "attrs.placeholders.firstName",
  "Last Name": "attrs.placeholders.lastName",
  Location: "attrs.placeholders.location",
};

/**
 * Only system-provided names are localized. Recruiter-created attribute and
 * category names remain exactly as entered, as required for user content.
 */
export function localizeAttributeName(name: string, t: TFunction): string {
  const key = ATTRIBUTE_KEYS[name];
  return key ? t(key) : name;
}

export function localizeCategoryName(name: string | undefined, t: TFunction): string {
  if (!name) return "";
  const key = CATEGORY_KEYS[name];
  return key ? t(key) : name;
}

export function localizeAttributePlaceholder(attribute: Attribute, t: TFunction): string {
  const key = PLACEHOLDER_KEYS[attribute.name];
  return key ? t(key) : attribute.description;
}
