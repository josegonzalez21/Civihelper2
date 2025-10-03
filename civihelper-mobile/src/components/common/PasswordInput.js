// src/components/common/PasswordInput.js
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import Input from "./Input";

export default function PasswordInput(props){
  const [show, setShow] = useState(false);
  return (
    <Input
      {...props}
      secureTextEntry={!show}
      rightIcon={
        <TouchableOpacity onPress={()=>setShow(s=>!s)}>
          <Feather name={show ? "eye-off" : "eye"} size={18} />
        </TouchableOpacity>
      }
    />
  );
}
