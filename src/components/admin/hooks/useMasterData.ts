import { useState, useEffect } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const ITEMS_PER_PAGE = 20;

export function useMasterData() {
  const [prodiFilter, setProdiFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.admin.getPaginatedMasterCourses,
    {
      prodi: prodiFilter,
      search: search,
    },
    { initialNumItems: ITEMS_PER_PAGE },
  );

  const totalCount = useQuery(api.admin.getMasterCoursesCount, {
    prodi: prodiFilter,
    search: search,
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [prodiFilter, search]);

  // Calculate pagination
  const totalPages = Math.ceil((totalCount ?? 0) / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const displayedCourses = results.slice(startIndex, endIndex);

  // Navigation functions
  const goToPage = (page: number) => {
    const requiredItems = page * ITEMS_PER_PAGE;
    if (requiredItems > results.length && status === "CanLoadMore") {
      loadMore(requiredItems - results.length);
    }
    setCurrentPage(page);
  };

  const nextPage = () => {
    if (currentPage < totalPages || status === "CanLoadMore") {
      goToPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  return {
    courses: displayedCourses,
    search,
    setSearch,
    prodiFilter,
    setProdiFilter,
    status,
    loadMore: (numItems: number) => loadMore(numItems),
    isLoading,
    totalLoaded: results.length,
    // Pagination exports
    currentPage,
    totalPages,
    goToPage,
    nextPage,
    prevPage,
    canGoNext: currentPage < totalPages || status === "CanLoadMore",
    canGoPrev: currentPage > 1,
  };
}
