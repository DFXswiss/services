import { useApi } from '@dfx.swiss/react';
import { useEffect, useMemo, useState } from 'react';

export type TemplateLanguage = 'de' | 'en';

export const TEMPLATE_LANGUAGES: TemplateLanguage[] = ['de', 'en'];

export const TEMPLATE_LANGUAGE_LABELS: Record<TemplateLanguage, string> = {
  de: 'Deutsch',
  en: 'English',
};

export interface TemplateContents {
  de: string;
  en?: string;
}

export interface SupportIssueTemplateInfo {
  id: number;
  name: string;
  contents: TemplateContents;
  authorMail: string;
  isOwn: boolean;
  isAdmin: boolean;
  created: string;
  updated: string;
}

export interface UseTemplates {
  listTemplates: (search?: string) => Promise<SupportIssueTemplateInfo[]>;
  createTemplate: (name: string, contents: TemplateContents) => Promise<SupportIssueTemplateInfo>;
  updateTemplate: (
    id: number,
    data: { name?: string; contents?: Partial<TemplateContents> },
  ) => Promise<SupportIssueTemplateInfo>;
  deleteTemplate: (id: number) => Promise<void>;
}

export function useTemplates(): UseTemplates {
  const { call } = useApi();

  async function listTemplates(search?: string): Promise<SupportIssueTemplateInfo[]> {
    const suffix = search ? `?search=${encodeURIComponent(search)}` : '';
    return call<SupportIssueTemplateInfo[]>({
      url: `support/template${suffix}`,
      method: 'GET',
    });
  }

  async function createTemplate(name: string, contents: TemplateContents): Promise<SupportIssueTemplateInfo> {
    return call<SupportIssueTemplateInfo>({
      url: 'support/template',
      method: 'POST',
      data: { name, contents },
    });
  }

  async function updateTemplate(
    id: number,
    data: { name?: string; contents?: Partial<TemplateContents> },
  ): Promise<SupportIssueTemplateInfo> {
    return call<SupportIssueTemplateInfo>({
      url: `support/template/${id}`,
      method: 'PUT',
      data,
    });
  }

  async function deleteTemplate(id: number): Promise<void> {
    return call<void>({
      url: `support/template/${id}`,
      method: 'DELETE',
    });
  }

  return useMemo(() => ({ listTemplates, createTemplate, updateTemplate, deleteTemplate }), [call]);
}

const ONLY_OWN_STORAGE_KEY = 'support.template.onlyOwn';

/**
 * Persistent toggle "Nur eigene Vorlagen anzeigen" — geteilt zwischen Liste und Picker
 * via localStorage. Default ist `true`.
 */
export function useTemplateOnlyOwn(): [boolean, (value: boolean) => void] {
  const [onlyOwn, setOnlyOwnState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(ONLY_OWN_STORAGE_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  // Sync state across components/tabs when localStorage changes
  useEffect(() => {
    function handleStorage(e: StorageEvent): void {
      if (e.key === ONLY_OWN_STORAGE_KEY && e.newValue !== null) {
        setOnlyOwnState(e.newValue === 'true');
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  function setOnlyOwn(value: boolean): void {
    setOnlyOwnState(value);
    try {
      localStorage.setItem(ONLY_OWN_STORAGE_KEY, String(value));
    } catch {
      // localStorage unavailable (private mode etc.) — fall back to in-memory only
    }
  }

  return [onlyOwn, setOnlyOwn];
}
