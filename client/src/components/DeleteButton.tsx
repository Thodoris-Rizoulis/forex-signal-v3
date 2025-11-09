import { Button } from "./ui/button";
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
} from "./ui/alert-dialog";

interface DeleteButtonProps {
  onClick: () => void;
  itemName: string;
  itemType: string;
  disabled?: boolean;
  className?: string;
  additionalWarning?: string;
}

export function DeleteButton({
  onClick,
  itemName,
  itemType,
  disabled = false,
  className = "",
  additionalWarning,
}: DeleteButtonProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={`border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 ${className}`}
        >
          <svg
            className="w-4 h-4 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="sm:max-w-md bg-white border-gray-200 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-red-600">
            Delete {itemType}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Are you sure you want to delete{" "}
            <span className="font-semibold">{itemName}</span>? This action
            cannot be undone.
            {additionalWarning && (
              <>
                <br />
                <br />
                <span className="text-amber-600 font-medium">Note:</span>{" "}
                {additionalWarning}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-3 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
          <AlertDialogCancel className="border-gray-300 hover:bg-gray-100 text-gray-700">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onClick}
            className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            Delete {itemType}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
