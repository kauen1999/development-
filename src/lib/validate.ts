export default function loginValidate(values: {
  email: string;
  password: string;
}) {
  const errors: {
    email?: string;
    password?: string;
  } = {};

  if (!values.email) {
    errors.email = "Requerido";
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
    errors.email = "Correo electrónico inválido";
  }

  if (!values.password) {
    errors.password = "Requerido";
  } else if (values.password.length < 8 || values.password.length > 20) {
    errors.password = "Debe tener entre 8 y 20 caracteres de longitud";
  } else if (values.password.includes(" ")) {
    errors.password = "Contraseña inválida";
  }

  return errors;
}

export function registerValidate(values: {
  name: string;
  email: string;
  password: string;
  cpassword: string;
}) {
  const errors: {
    name?: string;
    email?: string;
    password?: string;
    cpassword?: string;
  } = {};

  // Validación de nombre de usuario
  if (!values.name) {
    errors.name = "Requerido";
  } else if (values.name.includes(" ")) {
    errors.name = "Nombre de usuario inválido";
  }

  // Validación de correo electrónico
  if (!values.email) {
    errors.email = "Requerido";
  } else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}$/i.test(values.email)) {
    errors.email = "Correo electrónico inválido";
  }

  // Validación de contraseña
  if (!values.password) {
    errors.password = "Requerido";
  } else if (values.password.length < 8 || values.password.length > 20) {
    errors.password = "Debe tener entre 8 y 20 caracteres de longitud";
  } else if (values.password.includes(" ")) {
    errors.password = "Contraseña inválida";
  }

  // Validación de confirmación de contraseña
  if (!values.cpassword) {
    errors.cpassword = "Requerido";
  } else if (values.password !== values.cpassword) {
    errors.cpassword = "Las contraseñas no coinciden";
  } else if (values.cpassword.includes(" ")) {
    errors.cpassword = "Contraseña de confirmación inválida";
  }

  return errors;
}
