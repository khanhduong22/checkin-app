import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  latestVersion: string;
  changelog: any;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function ChangelogPopup({
  latestVersion,
  changelog,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? setControlledOpen! : setInternalOpen;

  useEffect(() => {
    if (isControlled) return;
    const seenVersion = localStorage.getItem("admin_changelog_version");
    if (seenVersion !== latestVersion) {
      const timer = setTimeout(() => {
        setInternalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [latestVersion, isControlled]);

  const handleClose = () => {
    localStorage.setItem("admin_changelog_version", latestVersion);
    setOpen(false);
  };

  if (!changelog) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant="outline"
              className="bg-emerald-50 text-emerald-600 border-emerald-200"
            >
              New Update
            </Badge>
            <span className="text-xs text-muted-foreground">
              {changelog.date}
            </span>
          </div>
          <DialogTitle className="text-xl">
            v{changelog.version}: {changelog.title}
          </DialogTitle>
          <DialogDescription>
            Hệ thống vừa được cập nhật các tính năng mới sau đây:
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <ul className="space-y-3 text-sm text-slate-600">
            {changelog.changes.map((change: string, i: number) => (
              <li key={i} className="flex gap-2 items-start">
                <span className="text-emerald-500 mt-1.5 text-[6px] shrink-0">
                  ●
                </span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: change.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>"),
                  }}
                />
              </li>
            ))}
          </ul>
        </div>

        <DialogFooter className="sm:justify-between flex-row items-center">
          <span className="text-xs text-muted-foreground hidden sm:block">
            Phiên bản {latestVersion}
          </span>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Đã hiểu!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
