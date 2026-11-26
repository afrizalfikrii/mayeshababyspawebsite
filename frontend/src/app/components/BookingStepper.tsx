import { Fragment } from "react";

export interface StepItem {
  num: number;
  label: string;
}

export const BOOKING_STEPS: StepItem[] = [
  { num: 1, label: "Pilih layanan" },
  { num: 2, label: "Pilih jadwal" },
  { num: 3, label: "Data peserta" },
  { num: 4, label: "Konfirmasi" },
];

interface BookingStepperProps {
  currentStep: number;
  steps?: StepItem[];
  skippedSteps?: number[];
}

export default function BookingStepper({
  currentStep,
  steps = BOOKING_STEPS,
  skippedSteps = [],
}: BookingStepperProps) {
  const totalSteps = steps.length;
  const activeStepItem = steps.find((item) => item.num === currentStep) ?? steps[0];

  return (
    <nav aria-label="Tahapan reservasi" className="mb-8 pb-5 border-b border-black/10">
      {/* Layar >= 640px: satu baris, 4 langkah, garis tipis sama lebar */}
      <ol className="hidden sm:flex items-center gap-[14px] w-full">
        {steps.map((item, idx) => {
          const isCurrent = currentStep === item.num;
          const isSkipped = skippedSteps.includes(item.num);

          return (
            <Fragment key={item.num}>
              <li
                aria-current={isCurrent ? "step" : undefined}
                className={`flex items-center gap-[14px] shrink-0 whitespace-nowrap text-[13px] md:text-[14px] leading-[20px] tabular-nums ${
                  isSkipped ? "opacity-50" : ""
                }`}
              >
                <span
                  className={
                    isCurrent
                      ? "text-[#C94A83] font-medium"
                      : "text-[#6B5A52] font-normal"
                  }
                >
                  {String(item.num).padStart(2, "0")}
                </span>
                <span
                  className={
                    isCurrent
                      ? "text-[#4A2A1A] font-medium"
                      : "text-[#6B5A52] font-normal"
                  }
                >
                  {item.label}
                </span>
              </li>

              {idx < steps.length - 1 && (
                <li
                  aria-hidden="true"
                  role="presentation"
                  className="flex-1 min-w-[12px] h-px bg-[rgba(0,0,0,0.25)]"
                />
              )}
            </Fragment>
          );
        })}
      </ol>

      {/* Layar < 640px: 1 baris langkah aktif + "Langkah X dari 4" + 4 batang progres */}
      <div className="sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <span
            aria-current="step"
            className="text-[15px] leading-[22px] font-medium text-[#4A2A1A] truncate"
          >
            {activeStepItem.label}
          </span>
          <span className="text-[12px] leading-[18px] text-[#6B5A52] tabular-nums shrink-0">
            Langkah {currentStep} dari {totalSteps}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label={`Progres reservasi: Langkah ${currentStep} dari ${totalSteps}, ${activeStepItem.label}`}
          aria-valuenow={currentStep}
          aria-valuemin={1}
          aria-valuemax={totalSteps}
          className="grid grid-cols-4 gap-[6px] mt-3"
        >
          {steps.map((item) => {
            const isFilled = item.num <= currentStep;
            return (
              <span
                key={item.num}
                aria-hidden="true"
                className={`h-[4px] rounded-[2px] transition-colors duration-150 ${
                  isFilled ? "bg-[#C94A83]" : "bg-[#E6DCD3]"
                }`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
}
