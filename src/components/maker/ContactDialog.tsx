import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Github,
  Linkedin,
  Mail,
  Quote,
  Code,
  Instagram,
  X,
} from "lucide-react";

import { AUTHOR_PROFILE } from "@/assets/contact/info";

interface ContactDialogProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ContactDialog({ trigger }: ContactDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        hideClose
        className="sm:max-w-[425px] p-0 overflow-hidden bg-white/80 backdrop-blur-xl border-white/20 shadow-2xl rounded-3xl"
      >
        {/* Header Image / Background */}
        <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative">
          <DialogClose className="absolute right-6 top-6 p-2 rounded-full hover:bg-white/10 transition-colors z-[70]">
            <X size={20} className="text-white" />
          </DialogClose>

          {/* Decoration Container (Clipped) */}
          <div className="absolute inset-0 overflow-hidden">
            <Code className="absolute -right-4 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
          </div>

          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl bg-slate-200 overflow-hidden relative z-10">
              <img
                src={AUTHOR_PROFILE.avatarUrl}
                alt={AUTHOR_PROFILE.name}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        <div className="pt-12 pb-8 px-6 text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold font-display text-slate-800">
              {AUTHOR_PROFILE.name}
            </h2>
            <p className="text-sm font-medium text-blue-600 uppercase tracking-widest">
              {AUTHOR_PROFILE.role}
            </p>
          </div>

          <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 text-sm italic text-slate-600 relative mx-2">
            <Quote
              size={24}
              className="text-blue-200 absolute -top-3 -left-2 fill-blue-50"
            />
            "{AUTHOR_PROFILE.quote}"
          </div>

          <p className="text-sm text-slate-500 leading-relaxed px-2">
            {AUTHOR_PROFILE.description}
          </p>

          <div className="flex items-center justify-center gap-4 pt-2">
            <a
              href={AUTHOR_PROFILE.socials.github}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="icon"
                variant="outline"
                className="rounded-full hover:bg-blue-50 hover:text-blue-600 border-slate-200"
              >
                <Github size={18} />
              </Button>
            </a>
            <a
              href={AUTHOR_PROFILE.socials.linkedin}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="icon"
                variant="outline"
                className="rounded-full hover:bg-blue-50 hover:text-blue-600 border-slate-200"
              >
                <Linkedin size={18} />
              </Button>
            </a>
            <a
              href={AUTHOR_PROFILE.socials.instagram}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                size="icon"
                variant="outline"
                className="rounded-full hover:bg-pink-50 hover:text-pink-600 border-slate-200"
              >
                <Instagram size={18} />
              </Button>
            </a>
            <a href={`mailto:${AUTHOR_PROFILE.socials.email}`}>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full hover:bg-blue-50 hover:text-blue-600 border-slate-200"
              >
                <Mail size={18} />
              </Button>
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
