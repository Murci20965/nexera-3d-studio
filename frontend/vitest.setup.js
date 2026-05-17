import "@testing-library/jest-dom";

// jsdom does not implement createObjectURL
global.URL.createObjectURL = () => "blob:mock";
global.URL.revokeObjectURL = () => {};
