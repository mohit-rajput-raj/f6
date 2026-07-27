import React from "react";
import Image from "next/image";

interface UserAvatarStackProps {
    /** Array of image URLs or fallback data */
    users?: { name: string; avatar: string }[];
    /** Number representing remaining people */
    remainingCount?: number;
}

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

function stringToColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 55%, 45%)`;
}

export function UserAvatarStack({
    users = [],
    remainingCount = 0,
}: UserAvatarStackProps) {
    if (users.length === 0 && remainingCount === 0) {
        return (
            <div className="flex items-center text-xs text-muted-foreground px-2">
                No members
            </div>
        );
    }

    return (
        <div className="flex items-center -space-x-2.5 overflow-hidden py-1">
            {users.map((user, index) => (
                <div
                    key={index}
                    className="relative inline-block h-8 w-8 rounded-full border-2 border-background bg-muted shadow-sm transition-transform hover:scale-110 hover:z-10"
                    title={user.name}
                >
                    {user.avatar ? (
                        <Image
                            src={user.avatar}
                            alt={user.name}
                            fill
                            sizes="32px"
                            className="rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className="flex h-full w-full items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{ backgroundColor: stringToColor(user.name) }}
                        >
                            {getInitials(user.name)}
                        </div>
                    )}
                </div>
            ))}

            {/* Remaining Counter Badge */}
            {remainingCount > 0 && (
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-card text-card-foreground shadow-sm transition-transform hover:scale-110 hover:z-10">
                    <span className="text-[10px] font-bold tracking-tight">+{remainingCount}</span>
                </div>
            )}
        </div>
    );
}