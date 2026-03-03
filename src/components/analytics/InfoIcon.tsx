interface InfoIconProps {
  tooltip: string;
}

export function InfoIcon({ tooltip }: InfoIconProps) {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-600 text-gray-400 text-[10px] font-medium cursor-help ml-0.5"
      title={tooltip}
      aria-label={tooltip}
    >
      ?
    </span>
  );
}
