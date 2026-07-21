import React from "react";
import Image from "next/image";

interface UserAvatarStackProps {
    /** Array of image URLs or fallback data */
    users?: { name: string; avatar: string }[];
    /** Number representing remaining people */
    remainingCount?: number;
}

const defaultUsers = [
    { name: "User 1", avatar: "https://picsum.photos/seed/user1/100/100" },
    { name: "User 2", avatar: "https://picsum.photos/seed/user2/100/100" },
    { name: "User 3", avatar: "https://picsum.photos/seed/user3/100/100" },
    { name: "User 4", avatar: "https://picsum.photos/seed/user4/100/100" },
];

export function UserAvatarStack({
    users = defaultUsers,
    remainingCount = 4,
}: UserAvatarStackProps) {
    return (
        <div className="flex items-center -space-x-4 overflow-hidden p-4">
            {users.map((user, index) => (
                <div
                    key={index}
                    className="relative inline-block h-10 w-10 rounded-full border-2 border-background bg-muted shadow-xl transition-transform hover:scale-105 hover:z-10"
                >
                    <Image
                        src={user.avatar}
                        alt={user.name}
                        fill
                        sizes="64px"
                        className="rounded-full object-cover grayscale-[20%] contrast-110"
                    />
                </div>
            ))}

            {/* Remaining Counter Badge (+4) */}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-card text-card-foreground shadow-xl transition-transform hover:scale-105 hover:z-10">
                <span className="text-sm font-bold tracking-tight">+{remainingCount}</span>
            </div>
        </div>
    );
}