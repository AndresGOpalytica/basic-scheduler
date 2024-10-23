"use client";

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

const generateEvents = () => {
  const events = [];

  // Starting date reference (October 10, 2024)
  const baseDate = new Date(2024, 9, 10); // month is 9 because months are 0-indexed

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

// Function to detect overlapping events
const detectOverlapsAndPaintRed = (events) => {
  const overlappingEvents = new Set();

  // Group events by resourceId
  const eventsByResource = events.reduce((acc, event) => {
    if (!acc[event.resourceId]) acc[event.resourceId] = [];
    acc[event.resourceId].push(event);
    return acc;
  }, {});

  // For each resource, check for overlapping events
  Object.values(eventsByResource).forEach((resourceEvents) => {
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

  // Paint overlapping events red
  return events.map((event) => {
    if (overlappingEvents.has(event.id)) {
      return { ...event, style: "background-color: red" };
    }
    return { ...event, style: "" }; // Reset style if no overlap
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

export default function Scheduler({ ...props }) {
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [dependencies, setDependencies] = useState([]);

  const schedulerRef = useRef(null);

  const init = () => {
    const generatedResources = generateResources();
    let generatedEvents = generateEvents();

    // Detect overlaps and paint them red
    generatedEvents = detectOverlapsAndPaintRed(generatedEvents);

    setResources(generatedResources);
    setEvents(generatedEvents);
    setDependencies(generateRandomDependencies(5000));
  };

  // Function to handle event drop and recalculate overlaps
  const handleEventDrop = (e) => {
    const scheduler = schedulerRef?.current?.instance;
    if (!scheduler) return;

    const updatedEvents = scheduler.events.map((event) => ({
      id: event.id,
      name: event.name,
      resourceId: event.resourceId,
      startDate: event.startDate,
      endDate: event.endDate,
    }));

    // Detect overlaps and update the events in the scheduler
    const newEvents = detectOverlapsAndPaintRed(updatedEvents);
    setEvents(newEvents); // Update the state with the new event styles
  };

  useEffect(() => {
    // Bryntum Scheduler instance
    const scheduler = schedulerRef?.current?.instance;
  }, []);

  useEffect(() => {
    init();
  }, []);

  return (
    <>
      <BryntumScheduler
        {...props}
        ref={schedulerRef}
        events={events}
        dependencies={dependencies}
        resources={resources}
        eventMenuFeature={false}
        dependencyEditFeature={false}
        eventDragCreateFeature={false}
        eventDragSelectFeature={true}
        dependenciesFeature={{
          allowCreate: false,
        }}
        onEventDrop={handleEventDrop} // Attach the event drop handler
      />
    </>
  );
}
