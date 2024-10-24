import { BryntumScheduler } from "@bryntum/scheduler-react";
import { useEffect, useRef, useState } from "react";

const generateResources = () => {
  const resources = [];
  for (let i = 1; i <= 50; i++) {
    resources.push({
      id: i,
      name: `Resource ${i}`,
    });
  }
  return resources;
};

const generateNonWorkingRanges = () => {
  const nonWorkingRanges = [];
  const startDate = new Date(2024, 9, 1); // October 1, 2024
  const endDate = new Date(2024, 9, 31); // October 31, 2024

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();

    if (day === 0 || day === 6) {
      // Weekend: full day non-working
      const weekendDay = new Date(d); // Clone date
      nonWorkingRanges.push({
        startDate: new Date(weekendDay.setHours(0, 0, 0, 0)), // Create new Date
        endDate: new Date(weekendDay.setHours(24, 0, 0, 0)), // Create new Date
        cls: "non-working-range",
      });
    } else {
      // Weekday: non-working from 10 PM (22:00) to 6 AM (06:00) the next day
      const startNonWorking = new Date(d); // Clone date
      startNonWorking.setHours(22, 0, 0, 0); // Set start time to 10 PM

      const endNonWorking = new Date(d); // Clone date again
      endNonWorking.setDate(d.getDate() + 1); // Move to the next day for 6 AM
      endNonWorking.setHours(6, 0, 0, 0); // Set end time to 6 AM

      nonWorkingRanges.push({
        startDate: startNonWorking,
        endDate: endNonWorking,
        cls: "non-working-range",
      });
    }
  }

  return nonWorkingRanges;
};

const generateEvents = () => {
  const events = [];

  // Starting date reference (October 10, 2024)
  const baseDate = new Date(2024, 9, 20); // month is 9 because months are 0-indexed

  for (let i = 1; i <= 5000; i++) {
    const resourceId = Math.trunc(i / 100) + 1;

    // Calculate the day for the event (e.g., events 1-10 go on Oct 10, events 11-20 on Oct 11, etc.)
    const dayOffset = Math.trunc(((i - 1) % 100) / 10);

    // Generate random overlap: 50% chance for an event to overlap with the previous one
    const overlap = i % 7 === 0 ? 0.5 : 0; // 0.5 hours overlap for every second event

    // Calculate start and end times (1-hour duration, each event starts after the previous one)
    const eventStartDate = new Date(baseDate);
    eventStartDate.setDate(baseDate.getDate() + dayOffset);
    eventStartDate.setHours(6 + ((i - 1) % 10) - overlap); // Adjust to overlap

    const eventEndDate = new Date(eventStartDate);
    eventEndDate.setHours(eventStartDate.getHours() + 1); // Event lasts for 1 hour

    events.push({
      id: i,
      name: `Event ${i}`,
      resourceId: resourceId,
      startDate: eventStartDate,
      endDate: eventEndDate,
    });
  }

  return events;
};

const detectOverlaps = (events, resourceIds = []) => {
  const overlappingEvents = new Set();

  // Group events by resourceId
  const eventsByResource = events.reduce((acc, event) => {
    if (!acc[event.resourceId]) acc[event.resourceId] = [];
    acc[event.resourceId].push(event);
    return acc;
  }, {});

  // Filter to check only the events for the specified resources, or all if no resourceIds are provided
  const resourcesToCheck = resourceIds.length
    ? resourceIds.reduce((acc, resourceId) => {
        if (eventsByResource[resourceId])
          acc[resourceId] = eventsByResource[resourceId];
        return acc;
      }, {})
    : eventsByResource;

  // Check for overlaps for each resource's events
  Object.values(resourcesToCheck).forEach((resourceEvents) => {
    for (let i = 0; i < resourceEvents.length; i++) {
      for (let j = i + 1; j < resourceEvents.length; j++) {
        const event1 = resourceEvents[i];
        const event2 = resourceEvents[j];

        // Check if the events overlap
        if (
          event1.startDate < event2.endDate &&
          event1.endDate > event2.startDate
        ) {
          // Add overlapping events to the set
          overlappingEvents.add(event1.id);
          overlappingEvents.add(event2.id);
        }
      }
    }
  });

  // Update only the affected events (those in the specified resources) and keep others untouched
  return events.map((event) => {
    // If resourceIds is empty, check all events; otherwise, check specific resources
    if (
      (!resourceIds.length || resourceIds.includes(event.resourceId)) &&
      overlappingEvents.has(event.id)
    ) {
      return { ...event, style: "background-color: red" };
    } else if (!resourceIds.length || resourceIds.includes(event.resourceId)) {
      return { ...event, style: "" }; // Reset style if no overlap within the specific resources
    }
    return event; // Return the event unchanged if it's not part of the specified resources
  });
};

const generateRandomDependencies = (count) => {
  const dependencies = new Set(); // Use Set to avoid duplicate dependencies

  // Generate random dependencies
  for (let i = 1; i <= count; i++) {
    let fromId, toId;

    do {
      // Randomly select fromId and toId (ensure fromId < toId)
      fromId = Math.floor(Math.random() * count) + 1;
      toId = Math.floor(Math.random() * count) + 1;
    } while (fromId >= toId || dependencies.has(`${fromId}-${toId}`)); // Ensure no backward or duplicate dependencies

    // Add the dependency to the set
    dependencies.add(`${fromId}-${toId}`);
  }

  // Convert Set into an array of dependency objects
  return Array.from(dependencies).map((dep, index) => {
    const [from, to] = dep.split("-").map(Number);
    return {
      id: index + 1, // Unique ID for each dependency
      from,
      to,
    };
  });
};

const isTickInOffTime = (tick, offZones) => {
  return offZones.some((offZone) => {
    return (
      tick.startDate >= offZone.startDate && tick.endDate <= offZone.endDate
    );
  });
};

export default function Scheduler() {
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [dependencies, setDependencies] = useState([]);
  const [nonWorkingRanges, setNonWorkingRanges] = useState([]);

  const schedulerRef = useRef(null);

  const init = () => {
    const generatedResources = generateResources();
    setResources(generatedResources);
    let generatedEvents = generateEvents();
    // Detect overlaps for all events
    generatedEvents = detectOverlaps(generatedEvents);
    setEvents(generatedEvents);
    setDependencies(generateRandomDependencies(5000));
    setNonWorkingRanges(generateNonWorkingRanges());
  };

  // Handle event drop
  const handleEventDrop = (e) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler) return;

    const oldResourceId = e.resourceRecord.id;
    const newResourceId = e.targetResourceRecord.id;
    const updatedEvents = scheduler.events.map((event) => ({
      id: event.id,
      name: event.name,
      resourceId: event.resourceId,
      startDate: event.startDate,
      endDate: event.endDate,
    }));

    // Detect overlaps for both old and new resource events
    let newEvents = detectOverlaps(updatedEvents, [
      oldResourceId,
      newResourceId,
    ]);

    setEvents(newEvents); // Update the state with new event styles
  };

  // Handle event resize
  const handleEventResize = (e) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler) return;

    const resourceId = e.resourceRecord.id;
    const updatedEvents = scheduler.events.map((event) => ({
      id: event.id,
      name: event.name,
      resourceId: event.resourceId,
      startDate: event.startDate,
      endDate: event.endDate,
    }));

    // Detect overlaps only for the resource events
    const newEvents = detectOverlaps(updatedEvents, [resourceId]);
    setEvents(newEvents); // Update the state with new event styles
  };

  const handleHideNonWorkingRanges = async ({ checked }) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler) return;
    console.log("handleHideNonWorkingRanges");
    if (checked) {
      const timeRanges = scheduler.timeRanges.map((timeRange) => ({
        startDate: timeRange.startDate,
        endDate: timeRange.endDate,
      }));
      scheduler.timeAxis.filterBy((tick) => {
        return !isTickInOffTime(tick, timeRanges);
      });
    } else {
      scheduler.timeAxis.clearFilters();
    }
  };

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <BryntumScheduler
        ref={schedulerRef}
        //Data
        events={events}
        dependencies={dependencies}
        resources={resources}
        timeRanges={nonWorkingRanges}
        //Default settings
        visibleDate={{
          date: new Date(), // Today
          block: "center",
        }}
        viewPreset="hourAndDay" // 1hour tick
        minZoomLevel={12} // 1day tick
        maxZoomLevel={20} // 5min tick
        infiniteScroll={true}
        minDate={new Date(2024, 9, 1)} // October 1, 2024
        maxDate={new Date(2024, 9, 31)} // October 2, 2024
        //Disabled features
        dependencyEditFeature={false}
        eventDragCreateFeature={false}
        eventDragSelectFeature={false}
        dependenciesFeature={{
          allowCreate: false,
          disabled: true,
        }}
        scheduleMenuFeature={false}
        cellMenuFeature={false}
        headerMenuFeature={false}
        //Enabled features
        eventMenuFeature={{
          items: {
            editEvent: false,
            deleteEvent: false,
            copyEvent: false,
            cutEvent: false,
            showAddtionalInfo: {
              text: "Tooltip",
              icon: "b-fa b-fa-fw b-fa-info-circle",
              weight: 200,
              onItem: (data) => {
                alert("Custom action clicked");
              },
            },
            showAdditionalFields: {
              text: "additional fields",
              icon: "b-fa b-fa-fw b-fa-folder-plus",
              weight: 200,
              onItem: (data) => {
                alert("Custom action clicked");
              },
            },
            showGroupedBatches: {
              text: "Grouped Batches",
              icon: "b-fa b-fa-fw b-fa-object-ungroup",
              weight: 200,
              onItem: (data) => {
                alert("Custom action clicked");
              },
            },
          },
        }}
        timeRangesFeature={{
          showCurrentTimeLine: true,
          showHeaderElements: false,
        }}
        timeAxisHeaderMenuFeature={{
          items: {
            zoomLevel: false,
            dateRange: true,
            currentTimeLine: false,
          },
        }}
        //Event listeners
        onEventDrop={handleEventDrop}
        onEventResizeEnd={handleEventResize}
        //Toolbar
        tbar={[
          {
            type: "check",
            text: "show dependencies",
            onChange: ({ checked }) => {
              schedulerRef.current.instance.features.dependencies.disabled =
                !checked;
            },
          },
          {
            type: "check", //nonWorkingRanges
            text: "hide off zones",
            onChange: handleHideNonWorkingRanges,
          },
          {
            type: "button",
            text: "scroll to date",
            onClick: () => {
              schedulerRef.current.instance.scrollToDate(
                new Date(2024, 9, 23, 12, 0, 0),
                {
                  block: "center",
                }
              );
            },
          },
        ]}
      />
    </>
  );
}
