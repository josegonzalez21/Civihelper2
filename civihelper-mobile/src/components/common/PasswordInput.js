// src/components/common/PasswordInput.js
import React, { useState } from "react";
import { TouchableOpacity } from "react-native";
import { Feather } from "@expo/vector-icons";
import Input from "./Input";

/**
 * Campo de contraseña con toggle de visibilidad.
 */
export default function PasswordInput(props) {
  const [show, setShow] = useState(false);

  // Filtra props que puedan causar conflicto si alguien pasa booleanos
  // a estilos numéricos; el Input ya sanitiza styles, así que aquí basta con
  // delegar y controlar el icono.
  const { ...rest } = props;

  return (
    <Input
      {...rest}
      secureTextEntry={!show}
      rightIcon={
        <TouchableOpacity onPress={() => setShow((s) => !s)}>
          <Feather
            name={show ? "eye-off" : "eye"}
            size={18}     // tamaño fijo seguro
            color="#555"  // color estándar
          />
        </TouchableOpacity>
      }
    />
  );
}
