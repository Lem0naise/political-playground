import random
import math
import os
import numpy
import difflib
import json
from time import sleep

# ~~~~~ CONFIG ~~~~~


# Print debug statements
DEBUG = False
# Non-voter distance (Higher number -> More polling participants)
TOO_FAR_DISTANCE = 190 
# Tolerance for coalition partners for Prop Rep (Higher number -> higher chance for coalitions)
COALITION_FACTOR = 1.1 
# Initial Party Merging threshold (Higher number -> more merging)
TOO_CLOSE_PARTY = 100
# Mandatory polling participation
VOTE_MANDATE = False
# Reduced poll counter for interactive gameplay
POLL_COUNTER = 30

# TODO: MAKE THE COALITION GOVERNMENT MORE FORMAL, WITH CABINET POSITIONS ETC
# TODO: ADJUST THE NUMBER OF POLLED VOTERS, WHEN TOO MANY IT IS SLOW
# TODO: REDUCE COMPATIBILITY OF DIFFERENT PARTIES
# TODO: DISPLAY NUMBER OF POLLING PEOPLE,  NOT TOTAL ELECTORATE
# TODO: DISPLAY A FEEDBACK AFTER CHOOSING AN OPTION, ABOUT WHICH VALUE YOU AFFECTED
# TODO: DISPLAY CHANGE FROM INITIAL POLLING AT END OF ELECTION

# ~~~~~ SETUP ~~~~~

VALUES = [
    "prog_cons",
    "nat_glob", 
    "env_eco",
    "soc_cap",
    "est_pop",
    "auth_ana",
    "rel_sec"
]

# DESCRIPTORS WHEN DISPLAYING GOVERNMENT
DESCRIPTORS = {
    "prog_cons": {-100: "very progressive", -30: "progressive", 0: None, 30: "conservative", 100: "ultraconservative"},
    "nat_glob": {-100: "ultranationalist", -30: "nationalist", 0: None, 30: "globalist", 100: "internationalist"},
    "env_eco": {-100: "environmentalist", 0: None, 50: None, 100: "anti-environmentalist"},
    "soc_cap": {-80: "far-left", -40: "left-wing", -20: "centre-left", 0: "centrist", 20: "centre-right", 100: "corporatist"},
    "est_pop": {-100: "pacifist", 20: None, 60: "militarist", 100: "ultramilitaristic"},
    "auth_ana": {-100: "dictatorial", -60: "authoritarian", -10: None, 60: "liberal", 100: "anarchist"},
    "rel_sec": {-100: "theocratic", -30: "religious", 0: None, 70: "secular"},
}

# Global variables
RESULTS = []
VOTING_DEMOS = {}
PARTIES_DATA = {}
EVENTS_DATA = []
COUNTRY = ""
scale_factor = 1
scale_fac = 1
not_voted = 0
previous_poll_results = {}  # Track previous poll percentages
initial_poll_results = {}   # Track first poll percentages for campaign comparison

# ~~~~~ CORE FUNCTIONS ~~~~~

def create_candidate(id, name, party, party_pop, prog_cons, nat_glob, env_eco, soc_cap, est_pop, auth_ana, rel_sec, colour=None, swing=None):
    """Create a candidate dictionary"""
    return {
        'id': id,
        'name': name,
        'party': party,
        'party_pop': party_pop,
        'vals': [prog_cons, nat_glob, env_eco, soc_cap, est_pop, auth_ana, rel_sec],
        'colour': colour,
        'swing': swing,
        'is_player': False
    }

def get_candidate_vals(candidate):
    """Get political values as list"""
    return candidate['vals']

def set_candidate_vals(candidate, vals):
    """Set political values from list"""
    candidate['vals'] = vals

def vote_for_candidate(voter_vals, candidates):
    """
    Calculate which candidate a polling respondent with given values would support.
    Returns the index of the preferred candidate, or None if they don't participate in polling.
    """
    global not_voted
    
    dists = []
    for i in range(len(candidates)):
        cand = candidates[i]
        euc_sum = 0
        for o in range(len(voter_vals)):  # sum square of each value
            val_key = list(voter_vals.keys())[o]
            euc_sum += (voter_vals[val_key] - cand['vals'][o])**2
        
        euc_dist = euc_sum
        
        # Apply party popularity - this is the main way polling changes
        popularity_effect = (cand['party_pop'] * 4)**2 # TODO here is another place effect is increased  # Increased effect for events to matter more
        # it used to be squared ^^ and now it's linear. think about this

        euc_dist -= popularity_effect
        
        if cand.get('swing'): 
            euc_dist -= (cand['swing']*5) * abs(cand['swing']*5)

        dists.append(euc_dist)  # add to distance list

    # Remove random preferences - events will drive changes instead
    index_min = min(range(len(dists)), key=dists.__getitem__)  # find preferred candidate by closest distance
    
    if (dists[index_min] <= TOO_FAR_DISTANCE**2) or (VOTE_MANDATE):  # if close enough to support them:
        return index_min  # Return the preferred candidate index
    else:  # if too radical for any party
        return None  # Don't participate in polling

def conduct_poll(data, candidates, poll_iteration=0):
    """Conduct a single poll of the entire electorate with stable preferences"""
    global not_voted
    
    # Reset results for this poll
    poll_results = [0] * len(candidates)
    not_voted = 0
    
    # Add small random polling volatility for natural variation
    for candidate in candidates:
        # Small random fluctuation in party popularity (±0.5 points max)
        random_volatility = random.uniform(-0.5, 0.5)
        candidate['party_pop'] += random_volatility
        
        # Ensure it doesn't go below minimum threshold
        if candidate['party_pop'] < -50:
            candidate['party_pop'] = -50
    
    # Add only very minimal polling noise to simulate margin of error
    polling_noise = random.uniform(0.995, 1.005)  # Increased to ±0.5% polling variation
    
    # Poll the entire electorate with stable preferences
    for voter_index in range(len(data[0])):
        # Create voter values for this person - these stay stable across polls
        voter_vals = {}
        for i, value_key in enumerate(VALUES):
            voter_vals[value_key] = data[i][voter_index]
            
            # Add very small random voter volatility (±2 points max on political positions)
            voter_volatility = random.uniform(-2.0, 2.0)
            voter_vals[value_key] += voter_volatility
            
            # Clamp values
            if voter_vals[value_key] >= 100:
                voter_vals[value_key] = 100
            if voter_vals[value_key] <= -100:
                voter_vals[value_key] = -100
        
        # Get this voter's choice
        choice = vote_for_candidate(voter_vals, candidates)
        if choice is not None:
            poll_results[choice] += 1
        else:
            not_voted += 1
    
    # Apply polling noise to results
    for i in range(len(poll_results)):
        poll_results[i] = int(poll_results[i] * polling_noise)
    
    # Return results as list of [candidate, votes] pairs
    results = []
    for i, candidate in enumerate(candidates):
        results.append([candidate, poll_results[i]])
    
    return results

def format_votes(votes):
    """Format polling support for display"""
    global scale_factor, scale_fac
    return f'{abs((votes*scale_factor + (random.randrange(0, int("0" + "9"*scale_fac)) if scale_fac > 1 else 0))):,}'

def print_poll_results(RESULTS, poll_num, total_polls):
    """Print current polling results in terminal"""
    global previous_poll_results, initial_poll_results
    
    os.system('cls' if os.name == 'nt' else 'clear')
    
    res = sorted(RESULTS, key=lambda l: l[1], reverse=True)
    total_support = sum([r[1] for r in res])
    weeks_left = total_polls - poll_num
    
    print("="*120)
    print(f"                         {COUNTRY.upper()} ELECTION POLLING")
    print(f"                      Poll {poll_num}/{total_polls} - {weeks_left} weeks until election")
    print("="*120)
    print()
    
    # Calculate current percentages and changes
    current_percentages = {}
    for i, (candidate, support) in enumerate(res):
        percentage = (support / total_support * 100) if total_support > 0 else 0
        current_percentages[candidate['party']] = percentage
        
        # Calculate change from previous poll
        previous_percentage = previous_poll_results.get(candidate['party'], percentage)
        change = percentage - previous_percentage
        
        # Format change display
        if change > 0:
            change_str = f"+{change:4.1f}%"
        elif change < 0:
            change_str = f"{change:5.1f}%"
        else:
            change_str = "  0.0%"
        
        # Don't show change for first poll
        if poll_num == 1:
            change_str = "   --"
        
        player_indicator = " ◄ YOU" if candidate['is_player'] else ""
        print(f"{i+1:2}. {candidate['party']:<50} │ {percentage:5.1f}% {format_votes(support):>12} │ {change_str:>8} │{player_indicator}")
    
 
    # Store initial results for final comparison
    if poll_num == 1:
        initial_poll_results = current_percentages.copy()
        if DEBUG:
            print("DEBUG: The poll number is currently 1. It is storing the initial numbers")
            print(initial_poll_results)
            input()
    # Update previous poll results for next time
    previous_poll_results = current_percentages.copy()
    
    print()
    print(f"Polling participation: {((total_support)/(VOTING_DEMOS[COUNTRY]['pop']))*100:.1f}%")
    print("-"*120)


def apply_event_effect(player_candidate, effect, boost):
    """Apply the effect of a player's choice to their candidate with larger impacts"""
    
    # Calculate polling impact BEFORE applying the changes to avoid inversion
    voter_alignment = 0
    
    if DEBUG:
        print(f"DEBUG: Calculating voter alignment for effects: {effect}")
    
    for value_key, change in effect.items():
        if value_key in VOTING_DEMOS[COUNTRY]["vals"]:
            voter_position = VOTING_DEMOS[COUNTRY]["vals"][value_key]
            
            # Find player's CURRENT position on this issue (before change)
            player_old_position = None
            for i, val_key in enumerate(VALUES):
                if val_key == value_key:
                    player_old_position = player_candidate['vals'][i]
                    break
            
            if player_old_position is not None:
                # Calculate NEW position after the change
                player_new_position = player_old_position + change
                # Clamp the new position to valid range for calculation
                player_new_position = max(-100, min(100, player_new_position))
                
                # Calculate how much closer/further this moves player to voter center
                distance_before = abs(voter_position - player_old_position)
                distance_after = abs(voter_position - player_new_position)
                alignment_change = distance_before - distance_after
                voter_alignment += alignment_change
                
                if DEBUG:
                    print(f"DEBUG: {value_key}: voter={voter_position}, old={player_old_position}, new={player_new_position}")
                    print(f"DEBUG: distance_before={distance_before}, distance_after={distance_after}, alignment_change={alignment_change}")
    
    if DEBUG:
        print(f"DEBUG: Total voter alignment: {voter_alignment}")
    
    # NOW apply the changes to the candidate
    for i, value_key in enumerate(VALUES):
        if value_key in effect:
            old_val = player_candidate['vals'][i]
            player_candidate['vals'][i] += effect[value_key]
            # Clamp values to valid range
            if player_candidate['vals'][i] > 100:
                player_candidate['vals'][i] = 100
            if player_candidate['vals'][i] < -100:
                player_candidate['vals'][i] = -100
            
            if DEBUG:
                print(f"DEBUG: Changed {value_key} from {old_val} to {player_candidate['vals'][i]}")
    
    # TODO increase numbers to make events less significant
    # decrease numbers to make events more significant
    # Convert voter alignment to polling change with larger effects for events
    base_change = voter_alignment / 30.0 # 15
    polling_change = base_change * (boost / 12.0) # 8
    
    # Add moderate randomness for event uncertainty
    random_factor = random.uniform(-1.0, 1.0)
    polling_change += random_factor
    
    # Simplified minimum effect logic - ensure events have some impact
    if abs(polling_change) < 0.5:
        # Use boost to determine minimum effect direction
        sign = 1 if boost >= 0 else -1
        minimum_effect = sign * abs(boost) / 30.0
        polling_change = minimum_effect
    
    # Cap maximum polling change
    polling_change = max(-5.0, min(5.0, polling_change))
    
    # Apply polling change
    old_popularity = player_candidate['party_pop']
    player_candidate['party_pop'] += polling_change
    
    # Ensure party popularity doesn't go below minimum threshold
    if player_candidate['party_pop'] < -50:
        player_candidate['party_pop'] = -50
    
    # Debug output to verify changes are being applied
    if DEBUG:
        print(f"DEBUG: Voter alignment: {voter_alignment:.2f}, Boost: {boost}")
        print(f"DEBUG: Base change: {base_change:.2f}, Random factor: {random_factor:.2f}")
        print(f"DEBUG: Final polling change: {polling_change:.2f}")
        print(f"DEBUG: Party popularity changed from {old_popularity:.2f} to {player_candidate['party_pop']:.2f}")
    
    return polling_change


def present_event(event, player_candidate):
    """Present an event to the player and get their choice"""
    print("\n" + "="*80)
    print("                            BREAKING NEWS")
    print("="*80)
    print(f"\n{event['title']}")
    print(f"{event['description']}")
    print()
    
    for i, choice in enumerate(event['choices']):
        print(f"{i+1}. {choice['text']}")
    
    print()
    while True:
        try:
            choice_num = int(input("What is your response? (1-3): ")) - 1
            if 0 <= choice_num < len(event['choices']):
                chosen = event['choices'][choice_num]
                old_popularity = player_candidate['party_pop']
                polling_change = apply_event_effect(player_candidate, chosen['effect'], chosen['boost'])
                
                print(f"\nYou chose: {chosen['text']}")
                
                # Show polling impact based on actual change
                if polling_change > 2:
                    print(f"📈 Your internal polling increases significantly! (+{polling_change:.1f} points)")
                elif polling_change > 0.5:
                    print(f"📈 Your internal polling increases slightly (+{polling_change:.1f} points)")
                elif polling_change > -0.5:
                    print(f"📊 Your internal polling remains relatively stable ({polling_change:+.1f} points)")
                elif polling_change > -2:
                    print(f"📉 Your internal polling decreases slightly. This isn't good. ({polling_change:.1f} points)")
                else:
                    print(f"📉 Your internal polling drops significantly! This is a disaster. ({polling_change:.1f} points)")
                
                # Show significance/media attention
                significance = chosen['boost']
                if significance > 25:
                    print(f"🔥 This becomes a MAJOR news story dominating headlines! This will have huge consequences!")
                elif significance > 20:
                    print(f"📰 This generates significant media coverage. Your popularity will be affected!")
                elif significance > 15:
                    print(f"📺 This receives moderate news attention. It will have some effect!")
                else:
                    print(f"📋 This gets limited media coverage. It won't affect much.")
                
                input("\nPress Enter to continue...")
                return
            else:
                print("Invalid choice. Please enter 1, 2, or 3.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def select_player_party(candidates):
    """Let the player select which party to play as"""
    print("\n" + "="*80)
    print("                         SELECT YOUR PARTY")
    print("="*80)
    print("\nWhich party would you like to play as?")
    print()
    
    for i, cand in enumerate(candidates):
        print(f"{i+1:2}. {cand['party']} (led by {cand['name']})")
    
    print()
    while True:
        try:
            choice = int(input("Enter your choice: ")) - 1
            if 0 <= choice < len(candidates):
                candidates[choice]['is_player'] = True
                print(f"\nYou are now playing as {candidates[choice]['party']}!")
                input("Press Enter to begin the election campaign...")
                return candidates[choice]
            else:
                print(f"Invalid choice. Please enter a number between 1 and {len(candidates)}.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def merge_party_names(party1, party2):
    """Generate a merged party name"""
    parts1 = party1.split()
    parts2 = party2.split()
    seq = difflib.SequenceMatcher(None, party1, party2)
    d = seq.ratio() * 100

    # Take a portion of each name
    if d > 60:
        merged_name = party1
    else:
        if parts1 and parts1[-1].strip() == "Party":
            party1 = " ".join(parts1[:-1])

        if len(party1) >= 15:  # if the name is extremely long
            party1 = ""
            for x in parts1:
                if x:
                    party1 += x[0]

        merged_name = f"{party1} - {party2}"

    return merged_name

def merge_too_close(candidates_list, x):
    """Merge parties that are too ideologically similar"""
    merges = 0
    current_list = candidates_list[:]
    
    while len(current_list) > 1:  # Continue while there are parties to potentially merge
        dists = []
        if x >= len(current_list): 
            x = 0

        for i in range(len(current_list)):  # finding closest ideological party
            part = current_list[i]
            led = current_list[x]
            euc_sum = 0
            for o in range(len(led['vals'])):  # sum square of each value
                euc_sum += (led['vals'][o] - part['vals'][o])**2
                if (led['vals'][o] > 0 and part['vals'][o] < 0) or (led['vals'][o] < 0 and part['vals'][o] > 0):
                    euc_sum += 100000 / len(led['vals'])  # party merging value flips
            euc_dist = math.sqrt(euc_sum)  # square root to find euclidean distance
            dists.append(euc_dist)  # add to distance list

        dists[dists.index(0)] = 999999
        index_min = min(range(len(dists)), key=dists.__getitem__)  # find closest party
        
        if dists[index_min] < TOO_CLOSE_PARTY:
            print(f"\n{COUNTRY} - PARTIES TO SORT: {len(current_list)-1}")
            print()
            print(f"\nThe electoral commission has warned that {current_list[x]['party']} and {current_list[index_min]['party']} are too politically similar.\n")
            print(f"{current_list[x]['party']} and {current_list[index_min]['party']} have formed a coalition.")

            sent1 = current_list[x]['party']
            sent2 = current_list[index_min]['party']

            nam = input("Enter a name for the merged parties (leave empty to refuse the coalition, 'a' to generate a name):\n").strip()

            if nam == '':
                # User declined this merge, try next party
                x = (x + 1) % len(current_list)
                # If we've checked all parties as potential merge leaders, no more merges possible
                if x == 0:
                    break
                continue
            else:
                if nam in ['a', 'A']:
                    nam = merge_party_names(sent1, sent2)

                new_party_leader = ""
                while new_party_leader == "":
                    try:
                        choice = int(input(f"Who will lead this new party? \n(1) {current_list[x]['name']} \n(2) {current_list[index_min]['name']}\n").strip())
                        if choice == 2:
                            new_party_leader = current_list[index_min]['name'] 
                        else: 
                            new_party_leader = current_list[x]['name']
                    except: 
                        pass

                current_list[x]['party'] = nam
                current_list[x]['name'] = new_party_leader 
                current_list[x]['party_pop'] = math.sqrt(current_list[x]['party_pop']**2 + current_list[index_min]['party_pop']**2)
                
                for v in range(len(current_list[x]['vals'])):
                    current_list[x]['vals'][v] = round((current_list[x]['vals'][v] + current_list[index_min]['vals'][v]) / 2)

                current_list.pop(index_min)
                print(f"A new party, {nam}, has been formed.")
                merges += 1
                input("Press Enter to continue...")
                
                # Reset x to 0 to start checking from the beginning with the new party configuration
                x = 0
        else:
            # No merge possible with current party as leader, try next party
            x = (x + 1) % len(current_list)
            # If we've checked all parties as potential merge leaders, no more merges possible
            if x == 0:
                break

        os.system('cls' if os.name == 'nt' else 'clear')
    
    return current_list, merges

def handle_party_merging(candidates):
    """Handle the party merging process"""
    print(f"\n=== PARTY CONSOLIDATION PHASE ===")
    print(f"The electoral commission is reviewing party similarities...")
    
    # Adjust merging threshold based on number of parties
    global TOO_CLOSE_PARTY
    original_threshold = TOO_CLOSE_PARTY
    TOO_CLOSE_PARTY *= 1 + (((len(candidates) - 6) / 5))  # 6 being the standard party list
    
    merged_candidates = candidates[:]
    total_merges = 0
    
    while True:
        # Try to merge parties
        temp_list, merges = merge_too_close(merged_candidates, 0)
        if merges == 0:
            break
        merged_candidates = temp_list
        total_merges += merges
    
    # Reset threshold
    TOO_CLOSE_PARTY = original_threshold
    
    if total_merges > 0:
        print(f"\nParty consolidation complete! {total_merges} merger(s) occurred.")
        print(f"Final party count: {len(merged_candidates)}")
        input("Press Enter to continue to party selection...")
    
    return merged_candidates

def run_interactive_election(data, candidates, pop):
    """Run the interactive election campaign simulation"""
    global RESULTS, not_voted
    
    # Find player candidate
    player_candidate = None
    for cand in candidates:
        if cand['is_player']:
            player_candidate = cand
            break
    if player_candidate == None:
        return # this won't happen.

    poll_count = 0
    event_counter = 0
    last_event_poll = 0  # Track when last event occurred
    
    print(f"\nStarting campaign as {player_candidate['party']}...")
    print("The election campaign begins! You have 30 weeks until election day.")
    sleep(1)
    
    # Conduct 30 polls throughout the campaign
    for poll_num in range(1, POLL_COUNTER + 1):
        print(f"\nConducting Poll {poll_num}/{POLL_COUNTER}...")
        
        # Conduct the poll
        RESULTS = conduct_poll(data, candidates, poll_num)
        
        # Display poll results
        print_poll_results(RESULTS, poll_num, POLL_COUNTER)
        
        # Present events more frequently since they're the main source of change
        if poll_num < POLL_COUNTER - 2:
            polls_since_event = poll_num - last_event_poll
            
            # Present event every 2-3 polls more frequently
            if polls_since_event >= 2:
                # Higher chance of event when eligible (50% instead of 30%)
                if random.random() < 0.5:
                    event_counter += 1
                    if event_counter <= len(EVENTS_DATA):
                        event = random.choice(EVENTS_DATA)
                        
                        # Store pre-event popularity for comparison
                        pre_event_popularity = player_candidate['party_pop'] if player_candidate else 0
                        
                        present_event(event, player_candidate)
                        
                        # Store post-event popularity
                        if player_candidate:
                            post_event_popularity = player_candidate['party_pop']
                            popularity_change = post_event_popularity - pre_event_popularity
                            
                            if DEBUG:
                                print(f"DEBUG: Event applied. Popularity change: {popularity_change:.2f}")
                        
                        last_event_poll = poll_num
                else:
                    input("\nPress Enter for next poll...")
            else:
                input("\nPress Enter for next poll...")
        else:
            # Final polls - no events, just show results
            if poll_num == POLL_COUNTER:
                print("\n🗳️  ELECTION DAY APPROACHES!")
                print("Final poll before the election...")
            input("\nPress Enter for next poll...")
    
    # Conduct the actual election (final poll with slightly higher participation)
    print("\n" + "="*120)
    print("                             ELECTION DAY")
    print("                        Votes are being counted...")
    print("="*120)
    sleep(2)
    
    # For the election, increase participation very slightly
    global TOO_FAR_DISTANCE
    original_threshold = TOO_FAR_DISTANCE
    TOO_FAR_DISTANCE = int(TOO_FAR_DISTANCE * 1.05)  # Only 5% more participation on election day
    
    # Conduct final election poll with minimal noise
    final_results = conduct_poll(data, candidates, POLL_COUNTER + 1)
    
    # Restore original threshold
    TOO_FAR_DISTANCE = original_threshold
    
    return sorted(final_results, key=lambda l: l[1], reverse=True)

def print_government_ideology(results, governing_parties):
    """Print the ideology of the governing coalition"""
    print("\n" + "="*70)
    print("                    GOVERNING COALITION")
    print("="*70)
    
    if len(governing_parties) == 1:
        party = governing_parties[0]
        print(f"\nSingle Party Government: {party['party']}")
    else:
        print(f"\nCoalition Government:")
        for party in governing_parties:
            print(f"  • {party['party']}")
    
    # Calculate average ideology
    if governing_parties:
        avg_vals = [0.0] * len(VALUES)
        for party in governing_parties:
            for i, val in enumerate(party['vals']):
                avg_vals[i] += val
        
        for i in range(len(avg_vals)):
            avg_vals[i] = avg_vals[i] / len(governing_parties)
        
        # Collect descriptors
        descriptors = []
        for i, value_key in enumerate(VALUES):
            val = avg_vals[i]
            descriptor = None
            for threshold in sorted(DESCRIPTORS[value_key].keys()):
                if val >= threshold:
                    descriptor = DESCRIPTORS[value_key][threshold]
            if descriptor:
                descriptors.append(descriptor)
        
        # Format into sentence
        if descriptors:
            print(f"\nGovernment Ideology:")
            if len(descriptors) == 1:
                print(f"  The government is {descriptors[0]}.")
            elif len(descriptors) == 2:
                print(f"  The government is {descriptors[0]} and {descriptors[1]}.")
            else:
                # Multiple descriptors - use commas and "and"
                descriptor_text = ", ".join(descriptors[:-1]) + f", and {descriptors[-1]}"
                print(f"  The government is {descriptor_text}.")
        else:
            print(f"\nGovernment Ideology:")
            print(f"  The government holds centrist positions on most issues.")

def intro():
    """Display the game introduction"""
    print("\n>Welcome to the Interactive Electoral Simulator.")
    print("I'm Indigo and here's how to play:")
    print("When you click enter to continue, the Simulator will start.")
    print("\n>You will first pick a country to get voting demographics and population.")
    print("Then you will pick a list of parties from a country (not necessarily the same).")
    print("Finally, you'll select which party YOU want to play as during the campaign!")
    print("\n>During the simulation, you'll face random events and make strategic choices.")
    print("Your decisions will affect your party's polling and position on key issues.")
    print("Try to win the election by making smart campaign decisions!")
    input("\n[...Continue...]")

def load_data_files():
    """Load all required data files"""
    global VOTING_DEMOS, PARTIES_DATA, EVENTS_DATA
    
    try:
        with open("countries.json", "r") as countries_file:
            VOTING_DEMOS = json.load(countries_file)

        with open("parties.json", "r") as parties_file:
            PARTIES_DATA = json.load(parties_file)

        # Try to load events file, create default events if not found
        try:
            with open("events.json", "r") as events_file:
                EVENTS_DATA = json.load(events_file)
        except FileNotFoundError:
            print("Events file not found. Creating default events...")
            
    except FileNotFoundError as e:
        print(f"Error: Could not find required data file: {e}")
        exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in data file: {e}")
        exit(1)


def calculate_party_compatibility(player_candidate, potential_partner):
    """Calculate ideological compatibility between parties (0-100)"""
    total_distance = 0
    for i in range(len(VALUES)):
        player_val = player_candidate['vals'][i]
        partner_val = potential_partner['vals'][i]
        distance = abs(player_val - partner_val)

        if (player_val > 0 and partner_val <0) or (player_val <0 and partner_val>0):
            distance += 10 # add additional penalty if opposing views

        total_distance += distance
    
    # Convert to compatibility score (higher = more compatible)
    max_possible_distance = len(VALUES) * 150  # Max distance if parties are at opposite extremes
    compatibility = 100 - (total_distance / max_possible_distance * 100)
    return max(0, min(100, compatibility))

def present_coalition_question(partner_party, question_data, player_candidate):
    """Present a policy question to the player during coalition negotiations"""
    print(f"\n{partner_party['party']} wants to know your position on {question_data['topic']}:")
    print(f"'{question_data['question']}'")
    print()
    
    for i, option in enumerate(question_data['options']):
        print(f"{i+1}. {option['text']}")
    
    print()
    while True:
        try:
            choice = int(input("Your response (1-3): ")) - 1
            if 0 <= choice < len(question_data['options']):
                chosen_option = question_data['options'][choice]
                
                # Apply policy effect to player
                if 'effect' in chosen_option:
                    for value_key, change in chosen_option['effect'].items():
                        for i, val_key in enumerate(VALUES):
                            if val_key == value_key:
                                player_candidate['vals'][i] += change
                                player_candidate['vals'][i] = max(-100, min(100, player_candidate['vals'][i]))
                
                return chosen_option['appeal']
            else:
                print("Invalid choice. Please enter 1, 2, or 3.")
        except ValueError:
            print("Invalid input. Please enter a number.")

def negotiate_coalition_partner(player_candidate, partner_candidate, player_percentage):
    """Negotiate with a potential coalition partner"""
    print(f"\n" + "="*70)
    print(f"                COALITION NEGOTIATIONS")
    print(f"              Approaching {partner_candidate['party']}")
    print("="*70)
    
    compatibility = calculate_party_compatibility(player_candidate, partner_candidate)
    base_willingness = compatibility
    
    # Adjust willingness based on player's performance
    if player_percentage > 40:
        base_willingness += 15  # Strong mandate
    elif player_percentage > 30:
        base_willingness += 5   # Decent performance
    else:
        base_willingness -= 10  # Weak performance
    
    print(f"\nYou are meeting with {partner_candidate['party']} leadership...")
    print(f"Initial assessment: {'Favorable' if base_willingness > 60 else 'Cautious' if base_willingness > 40 else 'Skeptical'}")
    
    # Coalition questions based on ideological differences
    questions = []
    
    # Economic policy question
    if abs(player_candidate['vals'][3] - partner_candidate['vals'][3]) > 20:  # soc_cap difference
        if partner_candidate['vals'][3] < player_candidate['vals'][3]:  # Partner is more left-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you commit to increasing social spending and workers\' rights?',
                'options': [
                    {'text': 'Yes, we will significantly increase social spending', 'appeal': 20, 'effect': {'soc_cap': -10}},
                    {'text': 'We can make some modest increases to social programs', 'appeal': 5, 'effect': {'soc_cap': -3}},
                    {'text': 'Our current economic platform is non-negotiable', 'appeal': -15, 'effect': {}}
                ]
            })
        else:  # Partner is more right-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you support business-friendly policies and reduce regulations?',
                'options': [
                    {'text': 'Yes, we will cut red tape and support businesses', 'appeal': 20, 'effect': {'soc_cap': 10}},
                    {'text': 'We can review some regulations for efficiency', 'appeal': 5, 'effect': {'soc_cap': 3}},
                    {'text': 'We believe current regulations are necessary', 'appeal': -15, 'effect': {}}
                ]
            })
    
    # Environmental policy question
    if abs(player_candidate['vals'][2] - partner_candidate['vals'][2]) > 25:  # env_eco difference
        if partner_candidate['vals'][2] < player_candidate['vals'][2]:  # Partner is more environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you commit to aggressive climate action and green policies?',
                'options': [
                    {'text': 'Yes, climate action will be our top priority', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We will take meaningful but measured environmental steps', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Economic growth must come before environmental concerns', 'appeal': -20, 'effect': {}}
                ]
            })
        else:  # Partner is less environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you support our ambitious climate action agenda?',
                'options': [
                    {'text': 'Yes, climate action is important for our future', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We can support reasonable environmental measures', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Environmental policy should not harm economic growth', 'appeal': -20, 'effect': {}}
                ]
            })
    
    # Social issues question
    if abs(player_candidate['vals'][0] - partner_candidate['vals'][0]) > 20:  # prog_cons difference
        if partner_candidate['vals'][0] < player_candidate['vals'][0]:  # Partner is more progressive
            questions.append({
                'topic': 'social issues',
                'question': 'Will you support progressive social reforms and minority rights?',
                'options': [
                    {'text': 'Yes, we will champion progressive social causes', 'appeal': 18, 'effect': {'prog_cons': -8}},
                    {'text': 'We support gradual social progress', 'appeal': 3, 'effect': {'prog_cons': -3}},
                    {'text': 'We prefer to focus on traditional values', 'appeal': -18, 'effect': {}}
                ]
            })
        else:  # Partner is more conservative
            questions.append({
                'topic': 'social issues',
                'question': 'Will you respect traditional values and institutions?',
                'options': [
                    {'text': 'Yes, we value tradition and stability', 'appeal': 18, 'effect': {'prog_cons': 8}},
                    {'text': 'We seek to balance tradition with necessary change', 'appeal': 3, 'effect': {'prog_cons': 3}},
                    {'text': 'We believe society needs rapid modernization', 'appeal': -18, 'effect': {}}
                ]
            })
    
    # Ask policy questions
    appeal_gained = 0
    for question in questions[:2]:  # Limit to 2 questions per partner
        appeal_gained += present_coalition_question(partner_candidate, question, player_candidate)
    
    # Offer cabinet positions
    print(f"\n{partner_candidate['party']} is also interested in cabinet positions...")
    print("What can you offer them?")
    print("1. Deputy Prime Minister and major ministry (Defense, Treasury, Foreign Affairs)")
    print("2. Important ministry (Education, Health, Environment)")
    print("3. Minor ministry or junior positions")
    print("4. No cabinet positions, just policy influence")
    
    while True:
        try:
            cabinet_choice = int(input("\nYour offer (1-4): "))
            if 1 <= cabinet_choice <= 4:
                cabinet_appeal = [25, 15, 5, -10][cabinet_choice - 1]
                break
            else:
                print("Invalid choice. Please enter 1, 2, 3, or 4.")
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    # Calculate final decision
    final_appeal = base_willingness + appeal_gained + cabinet_appeal
    
    print(f"\n{partner_candidate['party']} is deliberating...")
    sleep(1)
    
    if final_appeal > 60:
        print(f"✅ {partner_candidate['party']} accepts your coalition offer!")
        print(f"'We look forward to working together for the good of {COUNTRY}.'")
        return True
    elif final_appeal > 35:
        print(f"🤔 {partner_candidate['party']} is hesitant but might consider it...")
        print("'We need some time to think about this. We'll get back to you.'")
        # 50% chance of acceptance after hesitation
        if random.random() > 0.5:
            print(f"📞 Later: {partner_candidate['party']} calls back - they accept!")
            return True
        else:
            print(f"📞 Later: {partner_candidate['party']} calls back - they decline.")
            return False
    else:
        print(f"❌ {partner_candidate['party']} declines your coalition offer.")
        print(f"'We're afraid our parties are too far apart on key issues.'")
        return False

def player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
    """Handle coalition negotiations when the player is approached by the winner"""
    print(f"\n" + "="*70)
    print(f"                COALITION OFFER")
    print(f"         {winner_candidate['party']} approaches {player_candidate['party']}")
    print("="*70)
    
    compatibility = calculate_party_compatibility(player_candidate, winner_candidate)
    
    print(f"\n{winner_candidate['party']} has won {winner_percentage:.1f}% of the vote but needs coalition partners.")
    print(f"They are approaching your party ({player_percentage:.1f}%) for potential cooperation.")
    
    # Winner asks policy questions to player
    questions = []
    
    # Economic policy question
    if abs(player_candidate['vals'][3] - winner_candidate['vals'][3]) > 20:  # soc_cap difference
        if player_candidate['vals'][3] < winner_candidate['vals'][3]:  # Player is more left-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'We need to know - will you support our business-friendly economic policies?',
                'options': [
                    {'text': 'Yes, we can compromise on economic policy for the good of the country', 'appeal': 20, 'effect': {'soc_cap': 10}},
                    {'text': 'We can support some business measures but maintain worker protections', 'appeal': 5, 'effect': {'soc_cap': 3}},
                    {'text': 'Our economic principles are non-negotiable', 'appeal': -15, 'effect': {}}
                ]
            })
        else:  # Player is more right-wing
            questions.append({
                'topic': 'economic policy',
                'question': 'Will you accept our plans for increased social spending and regulation?',
                'options': [
                    {'text': 'Yes, we can support greater social investment', 'appeal': 20, 'effect': {'soc_cap': -10}},
                    {'text': 'We can accept modest increases if they are fiscally responsible', 'appeal': 5, 'effect': {'soc_cap': -3}},
                    {'text': 'We cannot support increased government spending', 'appeal': -15, 'effect': {}}
                ]
            })
    
    # Environmental policy question
    if abs(player_candidate['vals'][2] - winner_candidate['vals'][2]) > 25:  # env_eco difference
        if player_candidate['vals'][2] < winner_candidate['vals'][2]:  # Player is more environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Can you accept a more gradual approach to environmental policy?',
                'options': [
                    {'text': 'Climate action can be phased in gradually for economic stability', 'appeal': 20, 'effect': {'env_eco': 10}},
                    {'text': 'We need some meaningful environmental commitments', 'appeal': 5, 'effect': {'env_eco': 5}},
                    {'text': 'Environmental action cannot be delayed or compromised', 'appeal': -20, 'effect': {}}
                ]
            })
        else:  # Player is less environmental
            questions.append({
                'topic': 'environmental policy',
                'question': 'Will you support our ambitious climate action agenda?',
                'options': [
                    {'text': 'Yes, climate action is important for our future', 'appeal': 25, 'effect': {'env_eco': -15}},
                    {'text': 'We can support reasonable environmental measures', 'appeal': 8, 'effect': {'env_eco': -5}},
                    {'text': 'Environmental policy should not harm economic growth', 'appeal': -20, 'effect': {}}
                ]
            })
    
    # Ask questions and calculate appeal
    appeal_from_player = 0
    for question in questions[:2]:  # Limit to 2 questions
        appeal_from_player += present_coalition_question(winner_candidate, question, player_candidate)
    
    # Player makes demands
    print(f"\n{winner_candidate['party']}: 'What would your party need to join our coalition?'")
    print("\nWhat do you demand in return for your support?")
    print("1. Deputy Prime Minister and control of a major ministry")
    print("2. Senior ministry position (Health, Education, Environment)")
    print("3. Junior ministry and policy influence")
    print("4. Just policy commitments, no cabinet positions needed")
    print("5. We want to remain in opposition")
    
    while True:
        try:
            demand = int(input("\nYour demand (1-5): "))
            if 1 <= demand <= 5:
                break
            else:
                print("Invalid choice. Please enter 1, 2, 3, 4, or 5.")
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    if demand == 5:
        print(f"\nYou decline the coalition offer.")
        print(f"'{player_candidate['party']} believes we can serve the country better in opposition.'")
        return False
    
    # Calculate if winner accepts player's demands
    demand_cost = [30, 20, 10, 5][demand - 1]  # How much the winner gives up
    base_willingness = compatibility + appeal_from_player
    
    # Adjust based on how much winner needs the player
    seats_needed = max(0, 50 - winner_percentage)
    if player_percentage >= seats_needed:
        base_willingness += 20  # Player is essential
    elif player_percentage >= seats_needed * 0.7:
        base_willingness += 10  # Player is very helpful
    else:
        base_willingness += 5   # Player is somewhat helpful
    
    final_willingness = base_willingness - demand_cost
    
    print(f"\n{winner_candidate['party']} considers your demands...")
    sleep(2)
    
    if final_willingness > 50:
        demand_names = ["Deputy Prime Minister", "Senior Ministry", "Junior Ministry", "Policy Influence"]
        print(f"✅ {winner_candidate['party']} accepts!")
        print(f"'We agree to give {player_candidate['party']} {demand_names[demand-1]} in our coalition government.'")
        return True
    elif final_willingness > 25:
        print(f"🤔 {winner_candidate['party']}: 'Your demands are quite high. Let us consider other options first.'")
        print("They will get back to you after talking to other parties...")
        return False
    else:
        print(f"❌ {winner_candidate['party']}: 'I'm afraid your demands are too steep for what you bring to the coalition.'")
        return False

def watch_coalition_formation(player_candidate, results, total_votes):
    """Handle coalition formation when player is not the winner"""
    winner_candidate = results[0][0]
    winner_votes = results[0][1]
    winner_percentage = (winner_votes / total_votes * 100) if total_votes > 0 else 0
    
    # Find player's position and percentage
    player_percentage = 0
    player_position = 0
    for i, (candidate, votes) in enumerate(results):
        if candidate['is_player']:
            player_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
            player_position = i + 1
            break
    
    if winner_percentage > 50:
        print(f"\n{winner_candidate['party']} has won a majority government.")
        return [winner_candidate]
    
    print(f"\n" + "="*70)
    print("                    COALITION FORMATION")
    print(f"               {winner_candidate['party']} seeks partners")
    print("="*70)
    print(f"\n{winner_candidate['party']} won {winner_percentage:.1f}% but needs coalition partners to govern.")
    print("You watch as they approach potential partners...")
    
    # Show all parties and their compatibility with winner
    potential_partners = []
    for i, (candidate, votes) in enumerate(results[1:6], 1):
        if candidate['is_player']:
            continue
        partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
        compatibility = calculate_party_compatibility(winner_candidate, candidate)
        potential_partners.append((candidate, partner_percentage, compatibility))
    
    # Add player to the list
    player_compatibility = calculate_party_compatibility(winner_candidate, player_candidate)
    potential_partners.append((player_candidate, player_percentage, player_compatibility))
    
    # Sort by compatibility
    potential_partners.sort(key=lambda x: x[2], reverse=True)
    
    print(f"\nPotential coalition partners (sorted by compatibility):")
    for i, (candidate, percentage, compatibility) in enumerate(potential_partners):
        status = "YOU" if candidate['is_player'] else "Other Party"
        compat_text = "Highly Compatible" if compatibility > 70 else "Possible" if compatibility > 50 else "Difficult" if compatibility > 30 else "Practically Impossible"
        print(f"{i+1}. {candidate['party']:<50} {percentage:5.1f}% - {compat_text:<18} ({status})")
    
    coalition_partners = [winner_candidate]
    current_percentage = winner_percentage
    approached_player = False
    
    print(f"\nCoalition formation begins...")
    input("Press Enter to watch the negotiations...")
    
    # Winner approaches parties in order of compatibility
    for candidate, partner_percentage, compatibility in potential_partners:
        if current_percentage >= 50:
            break
            
        if candidate['is_player']:
            approached_player = True
            print(f"\n📞 {winner_candidate['party']} approaches YOUR party!")
            if player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
                coalition_partners.append(player_candidate)
                current_percentage += player_percentage
                print(f"\n🤝 You have joined the coalition! Coalition strength: {current_percentage:.1f}%")
                if current_percentage >= 50:
                    print(f"🎉 The coalition has achieved a majority!")
                    break
            else:
                print(f"\n❌ Coalition negotiations with your party failed.")
        else:
            print(f"\n🤝 {winner_candidate['party']} approaches {candidate['party']}...")
            sleep(1)
            
            # Simulate AI negotiations
            base_chance = min(90, compatibility + 20)
            if partner_percentage >= (50 - current_percentage):
                base_chance += 20  # Essential partner
            
            # Reduce chance if demands are too high
            if compatibility < 40:
                base_chance -= 30
                
            success_chance = max(10, min(90, base_chance))
            
            if random.randint(1, 100) <= success_chance:
                coalition_partners.append(candidate)
                current_percentage += partner_percentage
                print(f"✅ {candidate['party']} agrees to join the coalition!")
                print(f"   Coalition strength: {current_percentage:.1f}%")
                if current_percentage >= 50:
                    print(f"🎉 The coalition has achieved a majority!")
                    break
            else:
                print(f"❌ {candidate['party']} declines to join the coalition.")
                print(f"   'We cannot agree on key policy issues.'")
        
        if current_percentage < 50:
            input("Press Enter to continue...")
    
    # If player wasn't approached but coalition still needs partners
    if not approached_player and current_percentage < 50:
        remaining_need = 50 - current_percentage
        if player_percentage >= remaining_need * 0.5:  # Player could be helpful
            print(f"\n📞 With limited options remaining, {winner_candidate['party']} approaches YOUR party!")
            if player_coalition_negotiations(player_candidate, winner_candidate, player_percentage, winner_percentage):
                coalition_partners.append(player_candidate)
                current_percentage += player_percentage
                print(f"\n🤝 You have joined the coalition! Coalition strength: {current_percentage:.1f}%")
    
    if current_percentage < 50:
        print(f"\n⚠️  Coalition formation failed! {winner_candidate['party']} will attempt to form a minority government.")
        print(f"Final coalition strength: {current_percentage:.1f}%")
    
    return coalition_partners

def interactive_coalition_formation(player_candidate, results, total_votes):
    """Handle interactive coalition formation when player wins"""
    player_votes = results[0][1]
    player_percentage = (player_votes / total_votes * 100) if total_votes > 0 else 0
    
    if player_percentage > 50:
        print(f"\n🎉 You won with a majority! No coalition needed.")
        return [player_candidate]
    
    print(f"\n" + "="*70)
    print("                    COALITION FORMATION")
    print("="*70)
    print(f"\nYou won {player_percentage:.1f}% of the vote, but need a coalition to govern.")
    print("You need to reach 50%+ to form a stable government.")
    print("\nAvailable potential partners:")
    
    # Show potential partners
    potential_partners = []
    current_coalition_percentage = player_percentage
    
    for i, (candidate, votes) in enumerate(results[1:6], 1):  # Top 5 other parties
        partner_percentage = (votes / total_votes * 100) if total_votes > 0 else 0
        compatibility = calculate_party_compatibility(player_candidate, candidate)
        
        print(f"{i}. {candidate['party']:<50} {partner_percentage:5.1f}% "
              f"({'Highly Compatible' if compatibility > 70 else 'Possible' if compatibility > 50 else 'Difficult' if compatibility > 30 else 'Impossible'})")
        potential_partners.append((candidate, partner_percentage, compatibility))
    
    # Coalition building process
    coalition_partners = [player_candidate]
    
    print(f"\nCurrent coalition strength: {current_coalition_percentage:.1f}%")
    print("Select parties to approach for coalition talks:")
    
    while current_coalition_percentage < 50:
        print(f"\nYou need {50 - current_coalition_percentage:.1f}% more for a majority.")
        print("0. Try to form a minority government")
        
        for i, (candidate, percentage, compatibility) in enumerate(potential_partners, 1):
            if candidate not in coalition_partners:
                print(f"{i}. Approach {candidate['party']} ({percentage:.1f}%)")
        
        try:
            choice = int(input("\nWho do you want to approach? "))
            
            if choice == 0:
                print(f"\nYou decide to attempt forming a minority government with {current_coalition_percentage:.1f}%")
                print("This will be challenging but might work with informal support...")
                break
            elif 1 <= choice <= len(potential_partners):
                target_candidate, target_percentage, compatibility = potential_partners[choice - 1]
                
                if target_candidate in coalition_partners:
                    print("You've already partnered with them!")
                    continue
                
                # Negotiate with chosen partner
                if negotiate_coalition_partner(player_candidate, target_candidate, player_percentage):
                    coalition_partners.append(target_candidate)
                    current_coalition_percentage += target_percentage
                    print(f"\nCoalition strength is now {current_coalition_percentage:.1f}%")
                    
                    if current_coalition_percentage >= 50:
                        print(f"\n🎉 You have formed a majority coalition!")
                        break
                else:
                    print(f"\nNegotiations with {target_candidate['party']} failed.")
                
                input("Press Enter to continue...")
            else:
                print("Invalid choice.")
                
        except ValueError:
            print("Invalid input. Please enter a number.")
    
    return coalition_partners

def main():
    """Main function to run the electoral simulation"""
    global COUNTRY, scale_factor, scale_fac, RESULTS, not_voted, previous_poll_results, initial_poll_results
    
    # Load data files
    load_data_files()
    
    # Introduction
    intro()
    
    # Country selection
    print("\nAvailable countries:")
    for x in VOTING_DEMOS.keys():
        print(x)
    
    COUNTRY = difflib.get_close_matches(
        input("\nPick a country from the list: ").upper().strip(), 
        VOTING_DEMOS.keys(), 1)[0]
    
    scale_factor = VOTING_DEMOS[COUNTRY]["scale"]
    scale_fac = len(str(scale_factor))-1
    
    # Slightly randomize voting demographics
    for p in range(len(VOTING_DEMOS[COUNTRY]["vals"])):
        key = list(VOTING_DEMOS[COUNTRY]["vals"].keys())[p]
        VOTING_DEMOS[COUNTRY]["vals"][key] += round(10*(random.random()-0.5))
    
    # Party list selection
    print(f"\nAvailable party lists:")
    for country in PARTIES_DATA.keys():
        print(f"{country}: {len(PARTIES_DATA[country])} parties")
    
    choice = input("\nPick a party list (or combine with +): ").upper().strip()
    
    # Handle combined lists
    CANDIDATES = []
    if "+" in choice:
        countries = choice.split("+")
        for country in countries:
            country = country.strip()
            if country in PARTIES_DATA:
                for cand_data in PARTIES_DATA[country]:
                    new_cand = create_candidate(
                        len(CANDIDATES), cand_data['name'], cand_data['party'], cand_data['party_pop'],
                        cand_data['prog_cons'], cand_data['nat_glob'], cand_data['env_eco'], 
                        cand_data['soc_cap'], cand_data['est_pop'], cand_data['auth_ana'], 
                        cand_data['rel_sec'], colour=cand_data.get('colour'), swing=cand_data.get('swing')
                    )
                    CANDIDATES.append(new_cand)
    else:
        if choice in PARTIES_DATA:
            for i, cand_data in enumerate(PARTIES_DATA[choice]):
                new_cand = create_candidate(
                    i, cand_data['name'], cand_data['party'], cand_data['party_pop'],
                    cand_data['prog_cons'], cand_data['nat_glob'], cand_data['env_eco'], 
                    cand_data['soc_cap'], cand_data['est_pop'], cand_data['auth_ana'], 
                    cand_data['rel_sec'], colour=cand_data.get('colour'), swing=cand_data.get('swing')
                )
                CANDIDATES.append(new_cand)
    
    if not CANDIDATES:
        print("Invalid party list selection. Using UK as default.")
        for i, cand_data in enumerate(PARTIES_DATA["UK"]):
            new_cand = create_candidate(
                i, cand_data['name'], cand_data['party'], cand_data['party_pop'],
                cand_data['prog_cons'], cand_data['nat_glob'], cand_data['env_eco'], 
                cand_data['soc_cap'], cand_data['est_pop'], cand_data['auth_ana'], 
                cand_data['rel_sec'], colour=cand_data.get('colour'), swing=cand_data.get('swing')
            )
            CANDIDATES.append(new_cand)
    
    # Initialize results and reset previous poll tracking
    RESULTS = []
    previous_poll_results = {}
    initial_poll_results = {}
    
    # Handle party merging
    CANDIDATES = handle_party_merging(CANDIDATES)
    
    # Player party selection
    player_candidate = select_player_party(CANDIDATES)
    
    # Generate voting data for entire electorate
    print(f"\nGenerating {VOTING_DEMOS[COUNTRY]['pop']:,} voters...")
    data = []
    for value_key in VALUES:
        data.append(numpy.random.normal(
            loc=VOTING_DEMOS[COUNTRY]["vals"][value_key], 
            scale=100, 
            size=VOTING_DEMOS[COUNTRY]["pop"]
        ))
    
    # Shuffle each dimension independently
    for x in range(len(data)):
        numpy.random.shuffle(data[x])
    
    print("Electorate generated! Starting campaign...")
    sleep(1)
    
    # Run the interactive election campaign
    results = run_interactive_election(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'])
    
    # Print final election results
    os.system('cls' if os.name == 'nt' else 'clear')
    print("="*120)
    print("                           FINAL ELECTION RESULTS")
    print("                                ELECTION DAY")
    print("="*120)
    print()
    
    total_votes = sum([r[1] for r in results])
    
    for i, (candidate, votes) in enumerate(results):
        percentage = (votes / total_votes * 100) if total_votes > 0 else 0
        
        # Calculate campaign change from initial poll
        if DEBUG:
            print(initial_poll_results)
        initial_percentage = initial_poll_results.get(candidate['party'], percentage)
        campaign_change = percentage - initial_percentage
        
        # Format campaign change display
        if campaign_change > 0:
            campaign_change_str = f"+{campaign_change:4.1f}%"
        elif campaign_change < 0:
            campaign_change_str = f"{campaign_change:5.1f}%"
        else:
            campaign_change_str = "  0.0%"
        
        player_indicator = " ◄ YOU" if candidate['is_player'] else ""
        winner_indicator = " ★ WINNER" if i == 0 else ""
        print(f"{i+1:2}. {candidate['party']:<50} │ {percentage:5.1f}% {format_votes(votes):>12} │ {campaign_change_str:>8} │{player_indicator}{winner_indicator}")
    
    print()
    print(f"Final Turnout: {((total_votes + not_voted)/(VOTING_DEMOS[COUNTRY]['pop']))*100:.1f}%")
    print(f"Voting: {((total_votes)/(VOTING_DEMOS[COUNTRY]['pop']))*100:.1f}% │ Abstaining: {((not_voted)/(VOTING_DEMOS[COUNTRY]['pop']))*100:.1f}%")
    
    # Determine government formation
    winner = results[0][0]
    winner_percentage = (results[0][1] / total_votes * 100) if total_votes > 0 else 0    
    # Check if player won
    player_won = winner['is_player']
    
    if player_won:
        # Interactive coalition formation for player
        governing_parties = interactive_coalition_formation(player_candidate, results, total_votes)
        print_government_ideology(results, governing_parties)
    else:
        # Interactive coalition formation when player didn't win
        governing_parties = watch_coalition_formation(player_candidate, results, total_votes)
        print_government_ideology(results, governing_parties)
    
    # Show player performance
    player_position = None
    for i, (candidate, votes) in enumerate(results):
        if candidate['is_player']:
            player_position = i + 1
            break
    
    print(f"\n" + "="*70)
    print("                      YOUR PERFORMANCE")
    print("="*70)
    
    if player_position == 1:
        print("🎉 CONGRATULATIONS! You won the election!")
    elif player_position and player_position <= 3:
        ordinals = ["st", "nd", "rd"]
        ordinal = ordinals[player_position-1] if player_position <= 3 else "th"
        print(f"Good campaign! You finished in {player_position}{ordinal} place.")
    elif player_position:
        print(f"Better luck next time. You finished in {player_position}th place.")
    else:
        print("Something went wrong determining your position.")
    
    input("\nPress Enter to exit...")

if __name__ == "__main__":
    main()
