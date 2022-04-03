import { useContext } from "react";
import { CloudContext, GlobalContext } from "../contexts"

export const useGlobal = () => {
  return useContext(GlobalContext)
}

export const useCloud = () => {
  return useContext(CloudContext)
}
