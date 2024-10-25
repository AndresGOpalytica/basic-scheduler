import { useEffect, useRef, useState } from "react";
import { BryntumScheduler } from "@bryntum/scheduler-react";
// Constants
const RESOURCES_SIZE = 50;
const EVENTS_SIZE = 5000;
const AVOID_END_IN_OFF_ZONE = true;

const generateResources = () => {
  const resources = [];
  for (let i = 1; i <= RESOURCES_SIZE; i++) {
    resources.push({
      id: i,
      name: `Resource ${i}`,
      operations: [`Operation ${i}`, `Operation ${i + 1}`],
    });
  }
  return resources;
};

const generateEvents = () => {
  const events = [];

  // Starting date reference (October 10, 2024)
  const baseDate = new Date(2024, 9, 25); // month is 9 because months are 0-indexed

  for (let i = 1; i <= EVENTS_SIZE; i++) {
    const resourceId = Math.trunc(i / (EVENTS_SIZE / RESOURCES_SIZE)) + 1;

    // Calculate the day for the event (e.g., events 1-10 go on Oct 10, events 11-20 on Oct 11, etc.)
    const dayOffset = Math.trunc(
      ((i - 1) % (EVENTS_SIZE / RESOURCES_SIZE)) / 10
    );

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
      eventColor: "green",
      operation: `Operation ${resourceId}`,
      machineRestrictions: Array.from(
        { length: Math.floor(Math.random() * 3) },
        (_, i) => resourceId - i
      ),
    });
  }

  return events;
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

const generateRandomDependencies = () => {
  const dependencies = new Set(); // Use Set to avoid duplicate dependencies

  // Generate random dependencies
  for (let i = 1; i <= EVENTS_SIZE; i++) {
    let fromId, toId;

    do {
      // Randomly select fromId and toId (ensure fromId < toId)
      fromId = Math.floor(Math.random() * EVENTS_SIZE) + 1;
      toId = Math.floor(Math.random() * EVENTS_SIZE) + 1;
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
      // cls: ["", "merged-dependency", "predecessor-dependency"][index % 3],
    };
  });
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
  return events.reduce((acc, event) => {
    if (!resourceIds.length || resourceIds.includes(event.resourceId)) {
      const newColor = overlappingEvents.has(event.id) ? "red" : "green";
      if (event.currentColor !== newColor) {
        acc.push({
          id: event.id,
          eventColor: newColor,
        });
      }
    }
    return acc;
  }, []);
};

const detectDependenciesErrors = (dependencies) => {
  return dependencies.reduce((acc, dep) => {
    const cls =
      dep.fromEventEndDate > dep.toEventStartDate
        ? "error-dependency"
        : dep.originalCls;
    if (dep.cls !== cls) {
      acc.push({
        id: dep.id,
        cls,
      });
    }
    return acc;
  }, []);
};

const isTickInOffTime = (tick, offZones) => {
  return offZones.some((offZone) => {
    return (
      tick.startDate >= offZone.startDate && tick.endDate <= offZone.endDate
    );
  });
};

const isDateInOffTime = (date, offZones) => {
  return offZones.some((offZone) => {
    return date > offZone.startDate && date < offZone.endDate;
  });
};

const isEventInOffTime = (startDate, endDate, offZones) => {
  const isEndInOffTime =
    AVOID_END_IN_OFF_ZONE && isDateInOffTime(endDate, offZones);
  const isStartInOffTime =
    !isEndInOffTime && isDateInOffTime(startDate, offZones);

  return isStartInOffTime || isEndInOffTime;
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
    setEvents(generateEvents());
    setDependencies(generateRandomDependencies());
    setNonWorkingRanges(generateNonWorkingRanges());
  };

  // Handle event drop
  const handleEventDrop = ({
    resourceRecord,
    targetResourceRecord,
    eventRecords,
  }) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler || !scheduler.customData?.showErrors) return;

    const oldResourceId = resourceRecord.id;
    const newResourceId = targetResourceRecord.id;
    const updatedEvents = scheduler.events.map((event) => ({
      id: event.id,
      name: event.name,
      currentColor: event.eventColor,
      resourceId: event.resourceId,
      startDate: event.startDate,
      endDate: event.endDate,
    }));

    // Detect overlaps for both old and new resource events
    const newEvents = detectOverlaps(updatedEvents, [
      oldResourceId,
      newResourceId,
    ]);

    scheduler.eventStore.applyChangeset({
      updated: newEvents,
    });

    // Detect dependencies errors for the event dropped
    const eventDropped = eventRecords[0];
    const updatedDependencies = eventDropped.predecessors
      .concat(eventDropped.successors)
      .map((dep) => ({
        id: dep.id,
        cls: dep.cls,
        originalCls: dep.originalData.cls,
        fromEventEndDate: dep.fromEvent.endDate,
        toEventStartDate: dep.toEvent.startDate,
      }));
    const newDependencies = detectDependenciesErrors(updatedDependencies);

    scheduler.dependencyStore.applyChangeset({
      updated: newDependencies,
    });
  };

  // Handle event resize
  const handleEventResize = ({ changed, resourceRecord, eventRecord }) => {
    if (!changed) return;
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler || !scheduler.customData?.showErrors) return;

    const resourceId = resourceRecord.id;
    const updatedEvents = scheduler.events.map((event) => ({
      id: event.id,
      name: event.name,
      currentColor: event.eventColor,
      resourceId: event.resourceId,
      startDate: event.startDate,
      endDate: event.endDate,
    }));

    // Detect overlaps only for the resource events
    const newEvents = detectOverlaps(updatedEvents, [resourceId]);
    scheduler.eventStore.applyChangeset({
      updated: newEvents,
    });

    // Detect dependencies errors for the event dropped
    const updatedDependencies = eventRecord.predecessors
      .concat(eventRecord.successors)
      .map((dep) => ({
        id: dep.id,
        cls: dep.cls,
        originalCls: dep.originalData.cls,
        fromEventEndDate: dep.fromEvent.endDate,
        toEventStartDate: dep.toEvent.startDate,
      }));
    const newDependencies = detectDependenciesErrors(updatedDependencies);

    scheduler.dependencyStore.applyChangeset({
      updated: newDependencies,
    });
  };

  const handleHideNonWorkingRanges = async ({ checked }) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler) return;

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
        columns={[
          {
            text: "Name",
            field: "name",
          },
        ]}
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
          markerDef: "",
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
        onBeforeEventDropFinalize={({ source, context }) => {
          // Avoid dropping events in off zones
          const { startDate, endDate } = context;
          const offZones = source.timeRanges.map((tr) => ({
            startDate: tr.startDate,
            endDate: tr.endDate,
          }));
          if (isEventInOffTime(startDate, endDate, offZones)) {
            return (context.valid = false);
          }
          // Avoid dropping events in WCs with different operations
          const { eventRecords, newResource } = context;
          if (!newResource.operations.includes(eventRecords[0].operation)) {
            return (context.valid = false);
          }
          // Take in consideration the machine restrictions
          const machineRestrictions = eventRecords[0].machineRestrictions || [];
          if (
            machineRestrictions.length &&
            !machineRestrictions.includes(newResource.id)
          ) {
            return (context.valid = false);
          }
        }}
        onBeforeEventResizeFinalize={({
          source,
          startDate,
          endDate,
          finalize,
        }) => {
          // Avoid resizing events in off zones
          const offZones = source.timeRanges.map((tr) => ({
            startDate: tr.startDate,
            endDate: tr.endDate,
          }));
          return finalize(!isEventInOffTime(startDate, endDate, offZones));
        }}
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
            type: "check", //nonWorkingRanges
            text: "show errors",
            onChange: ({ checked }) => {
              const scheduler = schedulerRef.current.instance;
              if (!scheduler.customData) {
                scheduler.customData = {};
              }
              scheduler.customData.showErrors = checked;
              let newEvents = [];
              let newDependencies = [];
              if (checked) {
                // Detect overlaps for all events
                const updatedEvents = scheduler.events.map((event) => ({
                  id: event.id,
                  name: event.name,
                  currentColor: event.eventColor,
                  resourceId: event.resourceId,
                  startDate: event.startDate,
                  endDate: event.endDate,
                }));
                newEvents = detectOverlaps(updatedEvents);
                // Detect dependencies errors for all events
                const updatedDependencies = scheduler.dependencies.map(
                  (dep) => ({
                    id: dep.id,
                    cls: dep.cls,
                    originalCls: dep.originalData.cls,
                    fromEventEndDate: dep.fromEvent.endDate,
                    toEventStartDate: dep.toEvent.startDate,
                  })
                );
                newDependencies = detectDependenciesErrors(updatedDependencies);
              } else {
                newEvents = scheduler.events.map((event) => ({
                  id: event.id,
                  eventColor: event.originalData.eventColor,
                }));
                newDependencies = scheduler.dependencies.map((dep) => ({
                  id: dep.id,
                  cls: dep.originalData.cls,
                }));
              }
              scheduler.eventStore.applyChangeset({
                updated: newEvents,
              });
              scheduler.dependencyStore.applyChangeset({
                updated: newDependencies,
              });
            },
          },
          // {
          //   type: "button",
          //   text: "print scheduler",
          //   onClick: () => {
          //     const scheduler = schedulerRef.current.instance;
          //     console.log("Custom data", scheduler.customData);
          //   },
          // },
        ]}
      />
    </>
  );
}
