import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/ui/components/ui/alert-dialog"
import { Button } from "@repo/ui/components/ui/button"

export function AlertBox(
    {
        title='Are you absolutely sure?',
        triggerTitle='Show Dialog',
        description='This action cannot be undone. This will permanently delete your account from our servers.',
        canecelTitle='Cancel',
        continueTitle='Continue',
        variant,
        handleDeleteAllNodesandEdges
    }:{
        title:string
        triggerTitle:string
        description:string
        canecelTitle:string
        continueTitle:string
        variant?:  "default" | "destructive" | "link" | "outline" | "secondary" | "ghost" 
        handleDeleteAllNodesandEdges?: () => void
    }
) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={variant}>{triggerTitle}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{canecelTitle}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDeleteAllNodesandEdges}>{continueTitle}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
