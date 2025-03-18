import React, { useEffect, useState } from "react"

export const ClientSideOnly : React.FC<{children?:any}> = ({children}) => {
    const [isClient, setIsClient] = useState(false)
 
    useEffect(() => {
      setIsClient(true)
    }, [])
    if (!isClient) return <div suppressHydrationWarning/>
    return <div suppressHydrationWarning>
        {children}
    </div>
}