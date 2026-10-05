import React, {useState, useEffect} from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Picker, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import * as Haptics from 'expo-haptics';
export default function BookingModal(){
  const router = useRouter();
  const {state, dispatch} = useApp();
  const params = useLocalSearchParams<{barberId?:string}>();
  const [selectedBarber, setSelectedBarber] = useState(state.barbers[0]);
  const [date, setDate] = useState('');
  useEffect(()=>{
    if(params.barberId){
      const b = state.barbers.find(b=>b.id===params.barberId);
      if(b) setSelectedBarber(b);
    }
  },[params.barberId]);
  const saveBooking = async()=>{
    if(!date||!selectedBarber){
      Alert.alert('Error','Please select a barber and date');
      return;
    }
    const newBooking = {
      id: Date.now().toString(),
      barber: selectedBarber,
      date,
    };
    dispatch({type:'ADD_BOOKING',payload:newBooking});
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };
  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>New Booking</Text>
      <Text style={styles.label}>Barber</Text>
      {Platform.OS==='android' ? (
        <Picker selectedValue={selectedBarber.id} onValueChange={id=>setSelectedBarber(state.barbers.find(b=>b.id===id) as any)} style={styles.picker}>
          {state.barbers.map(b=>(<Picker.Item key={b.id} label={`${b.emoji} ${b.name}`} value={b.id} />))}
        </Picker>
      ) : (
        <View style={styles.pickerPlaceholder}><Text>{selectedBarber.name}</Text></View>
      )}
      <Text style={styles.label}>Date & Time (ISO string)</Text>
      <TextInput placeholder="2024-12-31T14:30" value={date} onChangeText={setDate} style={styles.input} />
      <TouchableOpacity onPress={saveBooking} style={styles.saveButton} accessibilityLabel="Confirm Booking">
        <Text style={styles.saveButtonText}>Confirm</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#fff',padding:16},
  title:{fontSize:24,fontWeight:'bold',marginBottom:12},
  label:{fontSize:16,marginTop:12},
  input:{height:44,borderColor:'#ccc',borderWidth:1,borderRadius:8,paddingHorizontal:12,marginTop:4},
  picker:{height:44},
  pickerPlaceholder:{height:44,justifyContent:'center',borderColor:'#ccc',borderWidth:1,borderRadius:8,paddingHorizontal:12,marginTop:4},
  saveButton:{height:44,backgroundColor:'#28a745',justifyContent:'center',alignItems:'center',borderRadius:8,marginTop:24},
  saveButtonText:{color:'#fff',fontSize:16,fontWeight:'600'}
});