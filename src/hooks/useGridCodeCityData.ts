import { useMemo } from "react";
import {
  MultiVersionCityBuilder,
  type CityData,
} from "@principal-ai/code-city-builder";
import { CodebaseView } from "@a24z/core-library";

interface UseGridCodeCityDataOptions {
  fileSystemTree: any;
  gridConfig?: CodebaseView | null;
  rootPath?: string;
}

interface UseGridCodeCityDataReturn {
  cityData: CityData | null;
  gridCells: Map<string, CityData> | null;
}

export function useGridCodeCityData({
  fileSystemTree,
  gridConfig,
}: UseGridCodeCityDataOptions): UseGridCodeCityDataReturn {
  return useMemo(() => {
    if (!fileSystemTree) {
      return { cityData: null, gridCells: null };
    }

    // Build city data using MultiVersionCityBuilder with a single version
    // Create a single-version map
    const versionMap = new Map([["main", fileSystemTree]]);
    const { unionCity } = MultiVersionCityBuilder.build(versionMap, {
      gridLayout: gridConfig || undefined,
    });

    // Use unionCity directly - it's the same as the old cityData
    const cityData = unionCity;

    // The grid layout is applied internally
    // gridCells could be extracted in the future if needed for visualization
    return {
      cityData,
      gridCells: null,
    };
  }, [fileSystemTree, gridConfig]);
}
