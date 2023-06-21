import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useCookies } from "react-cookie";

interface UserTypeContextType {
  userType: string;
  setUserType: (newUserType: string) => void;
}

const UserTypeContext = createContext<UserTypeContextType | undefined>(
  undefined
);

interface UserTypeProviderProps {
  children: ReactNode;
}

export const UserTypeProvider: React.FC<UserTypeProviderProps> = ({
  children,
}) => {
  const [userType, setUserType] = useState<string>("");
  const [cookies, setCookie] = useCookies(["userType"]);

  useEffect(() => {
    const storedUserType = cookies["userType"];
    if (storedUserType) {
      setUserType(storedUserType);
    }
  }, []);

  const setUserTypeWithCookie = (newUserType: string) => {
    setUserType(newUserType);
    setCookie("userType", newUserType, { path: "/" });
  };

  return (
    <UserTypeContext.Provider
      value={{ userType, setUserType: setUserTypeWithCookie }}
    >
      {children}
    </UserTypeContext.Provider>
  );
};

export const useUserType = (): UserTypeContextType => {
  const context = useContext(UserTypeContext);
  if (!context) {
    throw new Error(
      "useUserType debe ser utilizado dentro de un UserTypeProvider"
    );
  }
  return context;
};
