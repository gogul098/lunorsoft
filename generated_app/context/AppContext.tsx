import React, { createContext, useContext, useReducer, ReactNode } from "react";

/* Types */
export type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string; // YYYY-MM-DD
  completed: boolean;
};

type State = {
  assignments: Assignment[];
};

type Action =
  | { type: "ADD_ASSIGNMENT"; payload: Assignment }
  | { type: "TOGGLE_COMPLETE"; payload: { id: string } }
  | { type: "DELETE_ASSIGNMENT"; payload: { id: string } };

type AppContextProps = {
  state: State;
  addAssignment: (assignment: Assignment) => void;
  toggleComplete: (id: string) => void;
  deleteAssignment: (id: string) => void;
};

/* Initial State */
const initialState: State = {
  assignments: [
    {
      id: "1",
      title: "Read Chapter 4",
      course: "Biology 101",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
    },
    {
      id: "2",
      title: "Math Homework #5",
      course: "Calculus I",
      dueDate: new Date().toISOString().split("T")[0],
      completed: false,
    },
  ],
};

/* Reducer */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ADD_ASSIGNMENT":
      return { ...state, assignments: [action.payload, ...state.assignments] };
    case "TOGGLE_COMPLETE":
      return {
        ...state,
        assignments: state.assignments.map((a) =>
          a.id === action.payload.id ? { ...a, completed: !a.completed } : a
        ),
      };
    case "DELETE_ASSIGNMENT":
      return {
        ...state,
        assignments: state.assignments.filter((a) => a.id !== action.payload.id),
      };
    default:
      return state;
  }
}

/* Context Creation */
const AppContext = createContext<AppContextProps | undefined>(undefined);

/* Provider */
export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addAssignment = (assignment: Assignment) => {
    dispatch({ type: "ADD_ASSIGNMENT", payload: assignment });
  };

  const toggleComplete = (id: string) => {
    dispatch({ type: "TOGGLE_COMPLETE", payload: { id } });
  };

  const deleteAssignment = (id: string) => {
    dispatch({ type: "DELETE_ASSIGNMENT", payload: { id } });
  };

  return (
    <AppContext.Provider
      value={{ state, addAssignment, toggleComplete, deleteAssignment }}
    >
      {children}
    </AppContext.Provider>
  );
};

/* Hook */
export const useApp = (): AppContextProps => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};