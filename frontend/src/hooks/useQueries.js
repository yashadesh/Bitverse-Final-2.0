import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Default stale time of 5 minutes for student resources (notes, books, syllabus, pyqs)
// to dramatically reduce database pressure while keeping data fresh.
const DEFAULT_STALE_TIME = 5 * 60 * 1000; 

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await api.get("/stats");
      return data;
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useHomepage() {
  return useQuery({
    queryKey: ["homepage"],
    queryFn: async () => {
      const { data } = await api.get("/homepage");
      return data;
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useAnnouncements() {
  return useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data } = await api.get("/announcements");
      return Array.isArray(data) ? data : [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useTrending(limit = 8) {
  return useQuery({
    queryKey: ["trending", limit],
    queryFn: async () => {
      const { data } = await api.get(`/analytics/trending?limit=${limit}`);
      return Array.isArray(data?.trending) ? data.trending : [];
    },
    staleTime: 30 * 1000, // Trending can be slightly fresher (30s)
    refetchInterval: 30 * 1000, // Keep updating periodically in background
  });
}

export function useSubjects(semester) {
  return useQuery({
    queryKey: ["subjects", { semester }],
    queryFn: async () => {
      const url = semester ? `/subjects?semester=${semester}` : "/subjects";
      const { data } = await api.get(url);
      return Array.isArray(data) ? data : [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useSubject(subjectId) {
  return useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      const { data } = await api.get(`/subjects/${subjectId}`);
      return data;
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!subjectId,
  });
}

export function useSubjectModules(subjectId) {
  return useQuery({
    queryKey: ["subject-modules", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      const { data } = await api.get(`/subjects/${subjectId}/modules`);
      return data || [];
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!subjectId,
  });
}

export function useModuleFileCounts() {
  return useQuery({
    queryKey: ["module-file-counts"],
    queryFn: async () => {
      const { data } = await api.get(`/modules/file-counts`);
      return data || {};
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useFiles(params = {}) {
  return useQuery({
    queryKey: ["files", params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          searchParams.append(key, value);
        }
      });
      const queryStr = searchParams.toString();
      const url = queryStr ? `/files?${queryStr}` : "/files";
      const { data } = await api.get(url);
      return data || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}

export function useModule(moduleId) {
  return useQuery({
    queryKey: ["module", moduleId],
    queryFn: async () => {
      if (!moduleId) return null;
      const { data } = await api.get(`/modules/${moduleId}`);
      return data;
    },
    staleTime: DEFAULT_STALE_TIME,
    enabled: !!moduleId,
  });
}

export function useResources(resourceType = "book") {
  return useQuery({
    queryKey: ["resources", { resourceType }],
    queryFn: async () => {
      const { data } = await api.get(`/resources?resource_type=${resourceType}`);
      return data || [];
    },
    staleTime: DEFAULT_STALE_TIME,
  });
}
