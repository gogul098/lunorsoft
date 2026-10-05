import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useApp } from "../../context/AppContext";
import { format } from "date-fns";

export default function ExploreScreen() {
  const { state } = useApp();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("");

  const courses = useMemo(() => {
    const set = new Set(state.assignments.map((a) => a.course));
    return Array.from(set);
  }, [state.assignments]);

  const filtered = useMemo(() => {
    return state.assignments.filter((a) => {
      const matchesSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.course.toLowerCase().includes(search.toLowerCase());
      const matchesCourse = courseFilter ? a.course === courseFilter : true;
      return matchesSearch && matchesCourse;
    });
  }, [state.assignments, search, courseFilter]);

  const renderItem = ({ item }: { item: Assignment }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        Alert.alert(
          item.title,
          `Course: ${item.course}\nDue: ${format(
            new Date(item.dueDate),
            "PPP"
          )}\nStatus: ${item.completed ? "Completed" : "Pending"}`
        );
      }}
    >
      <Ionicons
        name={item.completed ? "checkmark-done" : "time-outline"}
        size={20}
        color={item.completed ? "#4caf50" : "#ff9800"}
        style={styles.itemIcon}
      />
      <View style={styles.itemTextContainer}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>
          {item.course} • Due {format(new Date(item.dueDate), "MMM d")}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search assignments or courses"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Course Filter */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter by Course:</Text>
        <FlatList
          data={["", ...courses]}
          horizontal
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                courseFilter === item && styles.filterChipActive,
              ]}
              onPress={() => setCourseFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  courseFilter === item && styles.filterChipTextActive,
                ]}
              >
                {item || "All"}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Results */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No assignments match your criteria.</Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

/* Types */
type Assignment = {
  id: string;
  title: string;
  course: string;
  dueDate: string;
  completed: boolean;
};

/* Styles */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 8,
    marginBottom: 12,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 4,
  },
  filterList: {
    paddingVertical: 4,
  },
  filterChip: {
    backgroundColor: "#e0e0e0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: "#0066ff",
  },
  filterChipText: {
    color: "#212121",
    fontSize: 13,
  },
  filterChipTextActive: {
    color: "#fff",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    elevation: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
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
  listContent: {
    paddingBottom: 80,
  },
});