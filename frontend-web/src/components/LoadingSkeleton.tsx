interface LoadingSkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
}

const LoadingSkeleton = ({
  width = '100%',
  height = '16px',
  borderRadius = '4px',
}: LoadingSkeletonProps) => (
  <div
    style={{
      width,
      height,
      borderRadius,
      background: 'linear-gradient(90deg, #0d1428 25%, #162040 50%, #0d1428 75%)',
      backgroundSize: '800px 100%',
      animation: 'shimmer 1.5s infinite',
    }}
  />
);

export default LoadingSkeleton;
