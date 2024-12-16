"use strict";

// Utility to convert degrees to radians
const radiansFromDegrees = (deg) => deg * (Math.PI / 180);

// Function to calculate the bounding extents (min, max) for given positions
const calculatePositionBounds = (positions) => {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < positions.length; i += 3) {
    const [x, y, z] = positions.slice(i, i + 3);
    min = [Math.min(min[0], x), Math.min(min[1], y), Math.min(min[2], z)];
    max = [Math.max(max[0], x), Math.max(max[1], y), Math.max(max[2], z)];
  }

  return { min, max };
};

// Process geometries and aggregate the min/max extents from each geometry
const aggregateGeometryExtents = (geometries) => {
  let overallMin = [Infinity, Infinity, Infinity];
  let overallMax = [-Infinity, -Infinity, -Infinity];

  geometries.forEach(({ data: { position } }) => {
    const { min, max } = calculatePositionBounds(position);
    overallMin = [Math.min(overallMin[0], min[0]), Math.min(overallMin[1], min[1]), Math.min(overallMin[2], min[2])];
    overallMax = [Math.max(overallMax[0], max[0]), Math.max(overallMax[1], max[1]), Math.max(overallMax[2], max[2])];
  });

  return { min: overallMin, max: overallMax };
};

// Exported functions
export { aggregateGeometryExtents, radiansFromDegrees };
