import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useApp } from "../../context/AppContext";
import { format } from "date-fns";

export default function HomeScreen() {
  const { state, addAssignment, toggleComplete, deleteAssignment } = useApp();
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleAdd = () => {
    if (!title.trim() || !course.trim() || !dueDate.trim()) return;
    addAssignment({
      id: Date.now().toString(),
      title: title.trim(),
      course: course.trim(),
      dueDate: dueDate.trim(),
      completed: false,
    });
    setTitle("");
    setCourse("");
    setDueDate("");
    Keyboard.dismiss();
  };

  const assignmentsDueToday = state.assignments.filter((a) => {
    const today = format(new Date(), "yyyy-MM-dd");
    return a.dueDate === today && !a.completed;
  }).length;

  const renderItem = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      style={[
        styles.itemContainer,
        item.completed && styles.itemCompleted,
      ]}
      onPress={() => {
        toggleComplete(item.id);
        Haptics.selectionAsync();
      }}
      onLongPress={() => {
        deleteAssignment(item.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }}
    >
      <View style={styles.itemLeft}>
        <Ionicons
          name={item.completed ? "checkmark-circle" : "ellipse-outline"}
          size={24}
          color={item.completed ? "#4caf50" : "#555"}
        />
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemTitle}>{item.title}</Text>
          <Text style={styles.itemSubtitle}>
            {item.course} • Due {format(new Date(item.dueDate), "MMM d")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Metric */}
      <View style={styles.metricContainer}>
        <Text style={styles.metricTitle}>Assignments Due Today</Text>
        <Text style={styles.metricValue}>{assignmentsDueToday}</Text>
        <Text style={styles.metricSub}>Stay on top of your workload</Text>
      </View>

      {/* List */}
      <FlatList
        data={state.assignments.sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No assignments yet. Add one below!</Text>
        }
      />

      {/* Add Assignment */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Add new assignment…"
          value={title}
          onChangeText={setTitle}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Course (e.g. Math 101)"
          value={course}
          onChangeText={setCourse}
          returnKeyType="next"
        />
        <TextInput
          style={styles.input}
          placeholder="Due date (YYYY-MM-DD)"
          value={dueDate}
          onChangeText={setDueDate}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* Types */
type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string; // ISO string (YYYY-MM-DD)
  completed: boolean;
};

/* Styles */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
  },
  metricContainer: {
    backgroundColor: "#0066ff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  metricTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  metricValue: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    marginVertical: 4,
  },
  metricSub: {
    color: "#e0e0e0",
    fontSize: 12,
  },
  listContent: {
    paddingBottom: 120,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
    elevation: 2,
  },
  itemCompleted: {
    backgroundColor: "#e8f5e9",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemTextContainer: {
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },
  itemSubtitle: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#777",
    marginTop: 40,
    fontSize: 14,
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    backgroundColor: "#f1f3f5",
    borderRadius: 8,
  },
  addButton: {
    backgroundColor: "#0066ff",
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
});