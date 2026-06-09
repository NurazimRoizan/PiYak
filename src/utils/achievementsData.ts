export type AchievementCode = 
    | 'FIRST_DROP' | 'DOUBLE_TROUBLE' | 'THE_MACHINE' | 'TACO_TUESDAY'
    | 'THE_REGULAR' | 'IRON_BOWEL' | 'NIGHT_OWL' | 'GHOST_TOWN' | 'OOPSIE'
    | 'CRIMSON_TIDE' | 'RED_WEDDING' | 'SHARK_WEEK' 
    | 'PARTNER_IN_CRIME' | 'SYNCHRONIZATION' | 'BLOOD_MOON';

export interface AchievementMeta {
    code: AchievementCode;
    title: string;
    description: string;
    icon: string;
    color: string; // Tailwind color class or hex
    type: 'poop' | 'period' | 'meta';
}

export const ACHIEVEMENTS: Record<AchievementCode, AchievementMeta> = {
    // Poop
    FIRST_DROP: { code: 'FIRST_DROP', title: 'First Drop', description: 'Logged your very first poop.', icon: '💩', color: '#FF00FF', type: 'poop' },
    DOUBLE_TROUBLE: { code: 'DOUBLE_TROUBLE', title: 'Double Trouble', description: 'Logged 2 poops in a single day.', icon: '✌️', color: '#00FFFF', type: 'poop' },
    THE_MACHINE: { code: 'THE_MACHINE', title: 'The Machine', description: 'Logged 3 or more poops in a single day.', icon: '🤖', color: '#FFFF00', type: 'poop' },
    TACO_TUESDAY: { code: 'TACO_TUESDAY', title: 'Taco Tuesday', description: 'Logged a poop on a Tuesday.', icon: '🌮', color: '#FF00FF', type: 'poop' },
    THE_REGULAR: { code: 'THE_REGULAR', title: 'The Regular', description: 'Logged at least 1 poop for 3 consecutive days.', icon: '📅', color: '#00FFFF', type: 'poop' },
    IRON_BOWEL: { code: 'IRON_BOWEL', title: 'Iron Bowel', description: 'Logged at least 1 poop for 7 consecutive days.', icon: '🛡️', color: '#FFFF00', type: 'poop' },
    NIGHT_OWL: { code: 'NIGHT_OWL', title: 'Night Owl', description: 'Logged a poop between 12 AM and 4 AM.', icon: '🦉', color: '#00FFFF', type: 'poop' },
    GHOST_TOWN: { code: 'GHOST_TOWN', title: 'The Ghost Town', description: 'Went 3 days without logging a poop.', icon: '👻', color: '#FFFFFF', type: 'poop' },
    OOPSIE: { code: 'OOPSIE', title: 'Oopsie', description: 'Used the Mistake button to reverse a log.', icon: '🙈', color: '#FF00FF', type: 'poop' },
    
    // Period
    CRIMSON_TIDE: { code: 'CRIMSON_TIDE', title: 'Crimson Tide', description: 'Logged your first period start.', icon: '🩸', color: '#FF0000', type: 'period' },
    RED_WEDDING: { code: 'RED_WEDDING', title: 'Red Wedding Survivor', description: 'Successfully completed a period.', icon: '💍', color: '#FF0000', type: 'period' },
    SHARK_WEEK: { code: 'SHARK_WEEK', title: 'Shark Week', description: 'Survived a period that lasted exactly 7 days.', icon: '🦈', color: '#00FFFF', type: 'period' },
    
    // Meta / Partner
    PARTNER_IN_CRIME: { code: 'PARTNER_IN_CRIME', title: 'Partner in Crime', description: 'Successfully connected a partner.', icon: '👯', color: '#FFFF00', type: 'meta' },
    SYNCHRONIZATION: { code: 'SYNCHRONIZATION', title: 'Synchronization', description: 'You and your partner logged a poop on the same day.', icon: '🔗', color: '#FF00FF', type: 'meta' },
    BLOOD_MOON: { code: 'BLOOD_MOON', title: 'Blood Moon', description: 'You and your partner are on your period at the same time.', icon: '🌘', color: '#FF0000', type: 'meta' }
};
