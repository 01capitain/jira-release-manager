"use client";

import * as React from "react";
import {
  CalendarBody,
  CalendarDate,
  CalendarDatePagination,
  CalendarDatePicker,
  CalendarHeader,
  CalendarMonthPicker,
  CalendarProvider,
  CalendarYearPicker,
  type CalendarState,
  type Feature,
  useCalendarMonth,
  useCalendarYear,
} from "~/components/ui/shadcn-io/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Calendar as RangeCalendar } from "~/components/ui/calendar";
import { Button } from "~/components/ui/button";
import type { ReleaseVersionWithBuildsDto } from "~/shared/types/release-version-with-builds";
import type { ReleaseCalendarEvent } from "~/shared/types/release-calendar";
import BuiltVersionCalendarEvent from "./built-version-calendar-event";
import type { DateRange } from "react-day-picker";

type ReleaseCalendarProps = {
  release: ReleaseVersionWithBuildsDto;
  events: ReleaseCalendarEvent[];
};

type CalendarFeature = Feature & { event: ReleaseCalendarEvent };

function useCalendarInitialization(date: Date) {
  const [, setMonth] = useCalendarMonth();
  const [, setYear] = useCalendarYear();

  React.useEffect(() => {
    setMonth(date.getMonth() as CalendarState["month"]);
    setYear(date.getFullYear());
  }, [date, setMonth, setYear]);
}

export default function ReleaseCalendar({
  release,
  events,
}: ReleaseCalendarProps) {
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const preferredDate = React.useMemo(() => {
    const parsed = new Date(release.createdAt);
    if (Number.isNaN(parsed.getTime())) return new Date();
    return parsed;
  }, [release.createdAt]);

  useCalendarInitialization(preferredDate);

  React.useEffect(() => {
    headingRef.current?.focus();
  }, [release.id]);

  const features = React.useMemo<CalendarFeature[]>(() => {
    return events.map((event, index) => ({
      id: `${event.builtVersionId}-${index}`,
      name: event.builtVersionName,
      startAt: new Date(event.timestamp),
      endAt: new Date(event.timestamp),
      status: {
        id: event.statusLabel ?? "createdAt",
        name: event.statusLabel ?? "Created",
        color: "hsl(var(--primary))",
      },
      event,
    }));
  }, [events]);

  const yearBounds = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const preferredYear = preferredDate.getFullYear();
    const start = Math.max(2000, Math.min(currentYear, preferredYear) - 1);
    const end = Math.max(currentYear, preferredYear) + 1;
    return { start, end };
  }, [preferredDate]);

  const releaseCreatedDate = React.useMemo(() => {
    const date = new Date(release.createdAt);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }, [release.createdAt]);

  const today = React.useMemo(() => {
    const current = new Date();
    current.setHours(0, 0, 0, 0);
    return current;
  }, []);

  const defaultRange = React.useMemo<DateRange | undefined>(() => {
    if (events.length === 0) return undefined;
    const timestamps = events
      .map((event) => new Date(event.timestamp))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (timestamps.length === 0) return undefined;
    return { from: timestamps[0], to: timestamps[timestamps.length - 1] };
  }, [events]);

  const [selectedRange, setSelectedRange] = React.useState<
    DateRange | undefined
  >(defaultRange);

  const defaultRangeKey = React.useMemo(() => {
    if (!defaultRange?.from || !defaultRange?.to) return `${release.id}-none`;
    return `${release.id}-${defaultRange.from.getTime()}-${defaultRange.to.getTime()}`;
  }, [defaultRange?.from, defaultRange?.to, release.id]);

  React.useEffect(() => {
    setSelectedRange(defaultRange);
  }, [defaultRange, defaultRangeKey]);

  const selectedRangeComplete =
    selectedRange?.from && selectedRange?.to ? selectedRange : undefined;
  const effectiveRange = selectedRangeComplete ?? defaultRange;
  const rangeStart = effectiveRange?.from;
  const rangeEnd = effectiveRange?.to;

  const rangeSummary = React.useMemo(() => {
    if (!rangeStart || !rangeEnd) return null;
    const formatter = new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${formatter.format(rangeStart)} → ${formatter.format(rangeEnd)}`;
  }, [rangeStart, rangeEnd]);

  const showNavigation = !rangeStart || !rangeEnd;

  const [rangePickerOpen, setRangePickerOpen] = React.useState(false);

  const resetButtonDisabled =
    !!defaultRange?.from &&
    !!defaultRange?.to &&
    selectedRange?.from?.getTime() === defaultRange.from.getTime() &&
    selectedRange?.to?.getTime() === defaultRange.to.getTime();

  const toggleRangePicker = () => setRangePickerOpen((open) => !open);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-neutral-600"
        >
          Release {release.name} calendar
        </CardTitle>
        <CardDescription>
          Built versions for release {release.name} plotted on their creation
          dates. Use the calendar controls to review previous months.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {defaultRange?.from && defaultRange?.to ? (
          <div className="space-y-2 rounded-lg border border-dashed border-neutral-200 p-3 dark:border-neutral-800">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <button
                type="button"
                onClick={toggleRangePicker}
                className="inline-flex items-center gap-2 font-medium underline-offset-4 hover:underline"
              >
                <span>Showing builds from {rangeSummary}</span>
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 text-neutral-500 transition-transform"
                  style={{
                    transform: rangePickerOpen ? "rotate(180deg)" : "none",
                  }}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.585l3.71-3.355a.75.75 0 111.02 1.1l-4.22 3.816a.75.75 0 01-1.02 0L5.21 8.33a.75.75 0 01.02-1.12z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRange(defaultRange)}
                disabled={resetButtonDisabled}
              >
                Reset to builds
              </Button>
            </div>
            {rangePickerOpen ? (
              <RangeCalendar
                mode="range"
                numberOfMonths={2}
                defaultMonth={selectedRange?.from ?? defaultRange.from}
                selected={selectedRange}
                onSelect={setSelectedRange}
                fromDate={releaseCreatedDate ?? defaultRange.from}
                toDate={today}
                disabled={{
                  before: releaseCreatedDate ?? defaultRange.from,
                  after: today,
                }}
                initialFocus
              />
            ) : null}
          </div>
        ) : null}
        <CalendarProvider
          className="w-full"
          startDay={1}
          visibleDays={5}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
        >
          {showNavigation ? (
            <CalendarDate className="flex flex-wrap items-center gap-3">
              <CalendarDatePicker className="flex flex-wrap gap-2">
                <CalendarMonthPicker />
                <CalendarYearPicker
                  start={yearBounds.start}
                  end={yearBounds.end}
                />
              </CalendarDatePicker>
              <CalendarDatePagination className="ml-auto" />
            </CalendarDate>
          ) : null}
          <div className="rounded-lg border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <CalendarHeader className="border-b border-neutral-200 px-2 py-2 dark:border-neutral-800" />
            <CalendarBody features={features}>
              {({ feature }) => {
                const event = (feature as CalendarFeature).event;
                return (
                  <BuiltVersionCalendarEvent
                    name={event.builtVersionName}
                    statusLabel={event.statusLabel}
                    components={event.components}
                  />
                );
              }}
            </CalendarBody>
          </div>
        </CalendarProvider>
        {events.length === 0 ? (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            This release does not have any builds yet. New builds will appear on
            the calendar as they are created.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
