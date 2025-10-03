// src/components/common/PickerField.js
import React, { useState } from "react";
import { Modal, View, Text, TouchableOpacity, FlatList } from "react-native";
import Input from "./Input";
export default function PickerField({ label, value, options, onChange }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Input label={label} value={value?.label || ""} editable={false} onPressIn={()=>setOpen(true)} />
      <Modal visible={open} transparent animationType="fade" onRequestClose={()=>setOpen(false)}>
        <View /* ...sheet styles... */>
          <FlatList
            data={options}
            keyExtractor={(it)=>String(it.value)}
            renderItem={({item})=>(
              <TouchableOpacity onPress={()=>{ onChange(item); setOpen(false); }}>
                <Text>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
