const schedulerConfig = {
  startDate: new Date(2024, 9, 10, 6),
  endDate: new Date(2024, 9, 20, 20),
  viewPreset: "hourAndDay",
  eventStyle: "border",
  columns: [
    {
      type: "resourceInfo",
      text: "Name",
      field: "name",
      width: 180,
      showImage: false,
    },
  ],
  stripeFeature: true,
  dependenciesFeature: true,
  features: {
    dependencies: {
      dependencyEdit: false,
      allowCreate: false,
    },
    eventDragCreate: false,
    eventDragSelect: true,
    eventEdit: false,
  },
};

export { schedulerConfig };
