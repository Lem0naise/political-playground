import random, math, os, numpy, difflib
from time import sleep

TOO_FAR_DISTANCE = 200 # adjust by how many values are added, reduce to make more people radical and less people vote
COALITION_FACTOR = 0.8 # reducing the tolerance for parties in a coalition (lower is less tolerant)

class Candidate:
    # -10 -> 10
    # progressive - conservative
    # nationalist - globalist
    # environmentalist - economist
    # socialist - capitalist
    def __init__(self, id, name, party, party_pop, prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec):
        self.id = id
        self.name = name
        self.party = party
        self.party_pop = (party_pop)
        self.vals = [prog_cons, nat_glob, env_eco, soc_cap, pac_mil, auth_ana, rel_sec]

class Voter:
    def __init__(self, vals):
        self.vals = vals

    def vote(self, candidates, rand_pref):
        global not_voted
        dists = []
        for cand in candidates:
            euc_sum = 0
            for o in range(len(self.vals)): # sum square of each value
                euc_sum += (self.vals[list(self.vals.keys())[o]] - cand.vals[o])**2
            euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            euc_dist -= cand.party_pop # take away party popularity from distance
            dists.append(euc_dist) # add to distance list

        dists[rand_pref] *= 0.95 # 0.95 by random preference of party

        index_min = min(range(len(dists)), key=dists.__getitem__) # find preferred candidate by closest distance
        if dists[index_min] <= TOO_FAR_DISTANCE: # if close enough to vote for them:
            RESULTS[index_min][1] += 1 # add one to vote count of preferred candidate
        else: # if too radical for any party
            not_voted += 1 # do not vote
        del self
        


def format_votes(votes):
    global scale_factor, scale_fac
    return (f'{abs((votes*scale_factor + (random.randrange(0, int("0" + "9"*scale_fac)) if scale_fac > 1 else 0))):,}')

STORED_RESULTS = None # for the increase or decrease
def print_results(RESULTS, rand_pref):

    global STORED_RESULTS

    moves = ["" for _ in RESULTS]
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    if STORED_RESULTS: # once have a board already printed
        for x in range(len(res)):
            change = STORED_RESULTS.index(res[x]) - x
            moves[x] = "▴" if change>0 else ("▾" if change < 0 else "")

    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + " - " + mode + "\n")
    for i in range(len(res)):
        # {str.ljust(('▴' if i == rand_pref else ''), 2)}
        print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(moves[i], 1)}{str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )
    print(f"{str.ljust('Not voted', 53)} : {format_votes(not_voted)}")
    print()

    STORED_RESULTS = res

def print_final_results(RESULTS, first=True, old_res = []):
    global STORED_RESULTS
    STORED_RESULTS = None
    res = sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count
    os.system('cls' if os.name == 'nt' else 'clear')
    print(COUNTRY + " - " + mode + "\n")
    for i in range(len(res)):
        if not first: # print with the percentage change
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} {str.ljust(('[▴' if (res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)>0 else '[▾') + str(round(abs(res[i][1]-old_res[res[i][0]])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2)) + '%]', 10)}: {format_votes(res[i][1])} votes " )
        else:
            print(f"{str.ljust(res[i][0].name, 20)} {str.ljust(res[i][0].party, 20)} : {str.ljust(str(round(res[i][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)*100, 2))+'%', 8)} : {format_votes(res[i][1])} votes " )

    print(f"{str.ljust('Not voted', 52)} : {format_votes(not_voted)}")
    print()


def run(data, cands, pop):

    rand_pref = 0
    cand_numbers = []
    for x in range(len(cands)):
        for _ in range((math.ceil(cands[x].party_pop)*2)+1):
            cand_numbers.append(x)

    # each voter number at which the region (random preference) changes
    regions = [] # must be length of cand_numbers - 1
    factor = pop // len(cand_numbers) # round factor
    factor * len(cand_numbers) # estimate of population

    for i in range(len(cand_numbers)):
        regions.append(factor*i)


    for it in range(1, pop): # population in tens of thousands

        vot = Voter(VOTING_DEMOS[COUNTRY]["vals"])

        # setting voter values from massive dataset
        for i in range(len(vot.vals)):
            vot.vals[list(vot.vals.keys())[i]] = data[i][it] # go through each data set from leftmost to rightmost
            if vot.vals[list(vot.vals.keys())[i]] >= 100:
                vot.vals[list(vot.vals.keys())[i]] = 100
            if vot.vals[list(vot.vals.keys())[i]] <= -100:
                vot.vals[list(vot.vals.keys())[i]] = -100

        vot.vote(cands, rand_pref) # calling vote

        # showing results

        if it % (pop//60 + 1) == 0:
            print_results(RESULTS, rand_pref)
            sleep(DELAY)
            
        if it in regions:
            # pick a new region
            cand_numbers.pop(cand_numbers.index(rand_pref))
            if len(cand_numbers) != 0:
                rand_pref = random.choice(cand_numbers)
        


    print_final_results(RESULTS)
    return sorted(RESULTS,key=lambda l:l[1], reverse=True) # sort by vote count


def coalition(leader, results_a):

    results = sorted(results_a ,key=lambda l:l[1], reverse=True) # sort results
    parties_in_order = [x[0] for x in results] # does not change
    new_leader = leader # set the leader variable

    # list of percentages DOES NOT CHANGE
    percs = [(results[x][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted)) for x in range(len(parties_in_order))]
    perc = results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) # current leader percentage

    # DOES CHANGE
    majority = False
    counter = 0

    while not majority:

        dists = []
        for part in parties_in_order: # finding closest ideological party
            euc_sum = 0
            for o in range(len(new_leader.vals)): # sum square of each value
                euc_sum += (new_leader.vals[o] - part.vals[o])**2
            euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
            if euc_dist != 0: # if not same party
                euc_dist += part.party_pop*5 # take away party popularity from distance (prefer smaller parties)
            dists.append(euc_dist) # add to distance list

        # calculating from distance which partners to have
        partners = []
        cur_dists = dists

        while perc < 0.5: # while do not have a majority go through the list of parties:
            index_min = min(range(len(cur_dists)), key=dists.__getitem__) # find preferred candidate by closest distance
            
            if cur_dists[index_min] > (TOO_FAR_DISTANCE*COALITION_FACTOR*1.1): # if cannot get a satisfying majority for the leader
                # reset the leader to the second place candidate
                counter += 1
                if counter >= len(parties_in_order):
                    return (new_leader, [])
                new_leader = parties_in_order[counter]
                perc = 0
                cur_dists = dists # reset the distances back to original
                break

            if cur_dists[index_min] == 0: # if it is the leader already
                cur_dists[index_min] = 99999
            else: # if found a good new coalition partner

                # the partner vetting all the preexisting partners and their relationships with them
                partner = parties_in_order[index_min]
                t_dists = []
                for part in partners:
                    euc_sum = 0
                    for o in range(len(partner.vals)): # sum square of each value
                        euc_sum += (partner.vals[o] - part.vals[o])**2
                    euc_dist = math.sqrt(euc_sum) # square root to find euclidean distance
                    t_dists.append(euc_dist) # add to distance list
                #t_dists.sort()
            
                if len(t_dists) > 0 and t_dists[-1] > TOO_FAR_DISTANCE*COALITION_FACTOR: # if any partner is over the too far distance
                    t_dists, t_partners = (list(t) for t in zip(*sorted(zip(t_dists, partners))))

                    #input(f'{partner.party} does not want to work with {t_partners[-1].party}')
                    cur_dists[index_min] = 999999 # already partnered with so remove from list
                else: # if satisfied
                    partners.append(partner)
                    cur_dists[index_min] = 999999 # already partnered with so remove from list
                    perc += percs[index_min]

        if perc > 0.5:
            majority = True
        

    return (new_leader, partners)



# ~~~~~~~~~~ CUSTOM USER COUNTRIES ~~~~~~~~~~~~

VOTING_DEMOS = {
    #COUNTRY: [pop in hundreds]
    "UK": {"pop": 70_029_0, "vals": {
                "prog_cons": -10,
                "nat_glob": -15,
                "env_eco": 35,
                "soc_cap":  55,
                "pac_mil": -24,
                "auth_ana": -17,
                "rel_sec": -23},
                "scale":100,
                "hos":"King Charles III"},

    "GERMANY 1936": {"pop": 61_024_1, "vals":{
                "prog_cons": 95,
                "nat_glob": -68,
                "env_eco": 64,
                "soc_cap":  4,
                "pac_mil": 78,
                "auth_ana": -56,
                "rel_sec": -56},
                "scale":100,
                "hos":"Paul von Hindenburg"},
    "GERMANY" : {"pop" : 85_029_5, "vals" : {
                "prog_cons": -12,
                "nat_glob": 34,
                "env_eco": 24,
                "soc_cap":  12,
                "pac_mil": 24,
                "auth_ana": -1,
                "rel_sec": -12},
                "scale":100,
                "hos":"Frank-Walter Steinmeier"},
    "HAMPTON": {"pop": 1_546, "vals": {
                "prog_cons": 21,
                "nat_glob": 0,
                "env_eco": 76,
                "soc_cap":  12,
                "pac_mil": -23,
                "auth_ana": -30,
                "rel_sec": 29},
                "scale":1,
                "hos":"Kevin Knibbs"},
    "DENMARK": {"pop": 50_843, "vals": {
                "prog_cons": -34,
                "nat_glob": 46,
                "env_eco": 0,
                "soc_cap":  -2,
                "pac_mil": -21,
                "auth_ana": 42,
                "rel_sec": 64},
                "scale":100,
                "hos":"Frank-Walter Steinmeier"},
    "NORTH KOREA": {"pop": 25_083_4, "vals" : {
                "prog_cons": 56,
                "nat_glob": -99,
                "env_eco": 35,
                "soc_cap":  -105,
                "pac_mil": 70,
                "auth_ana": -98,
                "rel_sec": 99},
                "scale":100,
                "hos":"Queen Margrethe II"},
    "USA" : {"pop": 350_000, "vals" : {
                "prog_cons": 20,
                "nat_glob": -35,
                "env_eco": 20,
                "soc_cap":  70,
                "pac_mil": 60,
                "auth_ana": 14,
                "rel_sec": -31},
                "scale":1000,
                "hos":"Chief Justice John Roberts"},
    "TURKEY" : {"pop": 87_000_0, "vals" : {
                "prog_cons": 38,
                "nat_glob": -24,
                "env_eco": 21,
                "soc_cap":  65,
                "pac_mil": 34,
                "auth_ana": -12,
                "rel_sec": 22},
                "scale":100},
    "FINLAND" : {"pop": 55_410, "vals" : {
                "prog_cons": -2,
                "nat_glob": 10,
                "env_eco": 12,
                "soc_cap":  -1,
                "pac_mil": 12,
                "auth_ana": 12,
                "rel_sec": 45},
                "scale":100,
                "hos":"Sauli Niinosto"},
    "RUSSIA" : {"pop": 143_000, "vals": {
                "prog_cons": 43,
                "nat_glob": -62,
                "env_eco": 71,
                "soc_cap":  69,
                "pac_mil": 75,
                "auth_ana": -61,
                "rel_sec": -31},
                "scale":1000,
                "hos":"Vladimir Putin"},
    "SOMALIA" : {"pop" : 17_000_0, "vals": {
                "prog_cons": 76,
                "nat_glob": -46,
                "env_eco": 89,
                "soc_cap":  85,
                "pac_mil": 89,
                "auth_ana": -57,
                "rel_sec": -64},
                "scale":100},
    "IRELAND" : {"pop": 60_123, "vals": {
                "prog_cons": 5,
                "nat_glob": -1,
                "env_eco": 32,
                "soc_cap":  14,
                "pac_mil": 12,
                "auth_ana": -4,
                "rel_sec": -41},
                "scale":100,
                "hos":"Michael Higgins"},
}

for x in VOTING_DEMOS.keys():
    print(x)
COUNTRY = difflib.get_close_matches(input("\nPick a country from the list: ").upper().strip(), VOTING_DEMOS.keys(), 1)[0] # get closest country
# SETTING SCALE FACTOR FOR COUNTRY POPULATION
scale_factor = VOTING_DEMOS[COUNTRY]["scale"] # from population to real population
scale_fac = len(str(scale_factor))-1

# SLIGHTLY RANDOMIZING VOTING DEMOGRAPHIC
for p in range(len(VOTING_DEMOS[COUNTRY])):
   #VOTING_DEMOS[COUNTRY]["vals"][VOTING_DEMOS[COUNTRY]["vals"].keys()[p]]
    VOTING_DEMOS[COUNTRY]["vals"][list(VOTING_DEMOS[COUNTRY]["vals"].keys())[p]] += round(20*(random.random()-0.5)) # randomise by 10 possibility each side


# ~~~~~~~~~~ CUSTOM USER PARTIES ~~~~~~~~~~~~

# progressive-conservative, nationalist-globalist, environmentalist-economical, socialist-capitalist, pacifist-militarist, 
# authoritation - anarchist
# the first number does not matter at all
# party popularity is from 1 to 10

CAND_LIST = {
    "UK": [
        Candidate(0, "Rishi Sunak", "Conservative", 8, 65, -24, 76, 71, -2, -21, 11),
        Candidate(1, "Ed Davey", "Lib Dems", 1, -32, 12, 24, 41, -40, -6, 31),
        Candidate(2, "Keir Starmer", "Labour", 10, -21, 41, -11, 14, 4, -1, 74),
        Candidate(5, "Hannah Sell", "Socialist Party", 1, -10, -11, 23, -41, -30, -5, 86),
        Candidate(3, "Zack Polanski", "Green", 1, -67, 71, -94, -31, -40, 41, 83),
        Candidate(4, "Nigel Farage", "Reform Party", 1, 95, -98, 65, 70, 90, -42, -3),
        Candidate(5, "Jeremy Corbyn", "Independent", 0.5, -50, 30, -40, -50, -10, -13, 95),
    ],
    "USA": [
        Candidate(0, "Donald Trump", "Republican", 10, 
                prog_cons = 60,
                nat_glob = -40,
                env_eco = 40,
                soc_cap =  95,
                pac_mil= 40,
                auth_ana= -63,
                rel_sec = -12),
        Candidate(1, "Joe Biden", "Democrat", 10,
                prog_cons = 20,
                nat_glob = 0,
                env_eco = 30,
                soc_cap = 78,
                pac_mil= 10,
                auth_ana= -22,
                rel_sec = 3),
        Candidate(2, "Jo Jorgensen", "Libertarian Party", 2,
                prog_cons = 30,
                nat_glob = 0,
                env_eco = 90,
                soc_cap = 90,
                pac_mil= -10,
                auth_ana= 62,
                rel_sec = 4),
        Candidate(3, "Howie Hawkins", "Green Party", 1, -40, 35, -85, -10, -50, -21, 65),
        Candidate(4, "Ron Edwards", "Christian C. Party", 3, 200, -50, 0, -20, 80, -67, -56)
    ],
    "GERMANY 1936": [
        Candidate(0, "Otto Wels", "SPD", 5, 12, -35, 24, -21, 36, 4, 12),
        Candidate(1, "Hadolf Itler", "NDSAP", 7, 98, -78, -1, 45, 86, -86, -45),
        Candidate(3, "Ernst Thalman", "KPD", 7, 57, -56, 24, -67, 78, 23, 41),
        Candidate(0, "Ludwig Kaas", "Centre", 5, 0, -12, 41, 12, 6, -12, 13),
    ],
    "NORTH KOREA": [
        Candidate(0, "Kim Jong-Un", "Worker's Party", 70, 59, -90, 23, -99, 90, -99, 100),
        Candidate(1, "Kim Ho-Chol", "Social Democrat", 20, -20, -20, -20, -60, 50, -52, 100)
    ],
    "FINLAND" : [
        Candidate(0, "", "Soc Dem", 10, -30, 20, -12, -12, -1, -10, 51),
        Candidate(1, "", "Centre Party", 9, 0, 2, 15, 10, -10, -31, 12),
        Candidate(2, "", "Green League", -3, -67, 75, 40, 0, -10, 1, 73),
        Candidate(3, "", "Left Alliance", 4, -30, 0, 10, -60, 0, -1, 68),
        Candidate(4, "", "National Coalition", 9, 34, 30, 40, 75, 10, -45, -14),
        Candidate(5, "", "Finns Party", 9, 68, -30, 20, 60, 49, -79, -15),
    ],
    "HAMPTON" : [
        Candidate(8, "James Greenfield", "KPD", 5,
                prog_cons= -60, 
                nat_glob= 20, 
                env_eco= -15,
                soc_cap= -50,
                pac_mil=  -24,
                auth_ana= -77,
                rel_sec = 0),
        
        Candidate(6, "Danil Eliasov", "Yes Please!", 5,
                prog_cons= 90, 
                nat_glob= -90, 
                env_eco= 90,
                soc_cap= 95,
                pac_mil=  100,
                auth_ana= -100,
                rel_sec = 0),

        Candidate(1, "Zac Nolan", "Peace and Prosperity", 5, 
                prog_cons= -21, 
                nat_glob= 39, 
                env_eco= -1,
                soc_cap= -5,
                pac_mil= -5,
                auth_ana= 14,
                rel_sec = 0),

        Candidate(7, "Theo Evison", "Prevalence", 5,
                prog_cons= 17, 
                nat_glob= -3, 
                env_eco= 30,
                soc_cap= 31,
                pac_mil=  1,
                auth_ana= -32,
                rel_sec = 0),

        Candidate(8, "Mehmet Altinel", "Front", 5,
                prog_cons= 80, 
                nat_glob= -50, 
                env_eco= 50,
                soc_cap= 98,
                pac_mil=  30,
                auth_ana= -78,
                rel_sec = 0),

        Candidate(12, "William Greenfield", "Economic Reformists", 5, 80, 100, 100, 100, 0, -100,
                rel_sec = 0),
        Candidate(13, "Ivo Meldrum", "MRL", 5, -20, 40, -40, -10, -20, 10,
                rel_sec = 0),
        Candidate(14, "Alex Wicks", "Nation First", 5, 
                prog_cons = -20,
                nat_glob = -70,
                env_eco = 85,
                soc_cap = 65,
                pac_mil = -30,
                auth_ana = 25,
                rel_sec = 0),
            Candidate(15, "Billiam the Third", "Confetto", 5, 
                prog_cons = 50,
                nat_glob = -90,
                env_eco = 79,
                soc_cap = 60,
                pac_mil = 85,
                auth_ana = -95,
                rel_sec = 0),
            Candidate(16, "Emperor Karl", "Imperius", 5, 
                prog_cons = 75,
                nat_glob = -90,
                env_eco = -12,
                soc_cap = 86,
                pac_mil = 85,
                auth_ana = -86,
                rel_sec = 0)
    ],
    "GERMANY" : [
        Candidate(0, "Olaf Scholz", "SPD", 10, 
                prog_cons= -31,
                nat_glob= 45,
                env_eco= 3,
                soc_cap= -4,
                pac_mil= 12,
                auth_ana= 12,
                rel_sec = 25),
        Candidate(1, "Friedrich Merz", "CDU", 9, 
                prog_cons= 24,
                nat_glob= 44,
                env_eco= 14,
                soc_cap= 24,
                pac_mil= 10,
                auth_ana= -12,
                rel_sec = -12),
        Candidate(3, "Ricarda Lang", "Alliance 90", 7, 
                prog_cons= -35,
                nat_glob= 45,
                env_eco= -45,
                soc_cap= -1,
                pac_mil= -23,
                auth_ana= 34,
                rel_sec = 54),
        Candidate(4, "Tino Chrupalla", "AfD", 3,
                prog_cons= 78,
                nat_glob= -45,
                env_eco= 45,
                soc_cap= 45,
                pac_mil= 45,
                auth_ana= -45,
                rel_sec = -12),
    ],
    "RADICALS" : [
        Candidate(0, "Karl Max", "Communist America", 5, 
                prog_cons=-100,
                nat_glob= 100,
                env_eco= -100,
                soc_cap= -100,
                pac_mil= -100,
                auth_ana= -100,
                rel_sec = 100),
        Candidate(0, "Jonathan Facsist", "America First", 5, 
                prog_cons=100,
                nat_glob= -100,
                env_eco= 100,
                soc_cap= 100,
                pac_mil= 100,
                auth_ana= 100,
                rel_sec = -100),           
    ],
    "IRELAND" : [
        Candidate(0, "Michael Martin", "Fianna Fail", 10, 
                prog_cons= 41,
                nat_glob= -12,
                env_eco= 34,
                soc_cap= 45,
                pac_mil= 12,
                auth_ana= -4,
                rel_sec = -31),
        Candidate(1, "Mary Lou McDonald", "Sinn Fein", 9, 
                prog_cons= -31,
                nat_glob= -43,
                env_eco= 31,
                soc_cap= -12,
                pac_mil= 31,
                auth_ana= 35,
                rel_sec = -54),
        Candidate(3, "Leo Varadkar", "Fine Gael", 9, 
                prog_cons= 2,
                nat_glob= 12,
                env_eco= 30,
                soc_cap= 65,
                pac_mil= -12,
                auth_ana= -10,
                rel_sec = -21),
        Candidate(4, "Eamon Ryan", "Green", 3,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= 29,
                rel_sec = 45),
    ],
    "TURKEY" : [
        Candidate(3, "Recep Erdogan", "AK", 9, 
                prog_cons= 56,
                nat_glob= -35,
                env_eco= 23,
                soc_cap= 65,
                pac_mil= 31,
                auth_ana= -94,
                rel_sec = -64),
        Candidate(4, "Kemal Kilicdaroglu", "Republican People's", 9,
                prog_cons= -12,
                nat_glob= -12,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= -12,
                rel_sec = 53),
        Candidate(4, "Mithat Sancar", "Democratic", 2,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= 29,
                rel_sec = 87),
        Candidate(4, "Devlet Bahceli", "Nationalist Movement", 2,
                prog_cons= -45,
                nat_glob= 41,
                env_eco= -46,
                soc_cap= -4,
                pac_mil= -31,
                auth_ana= 29,
                rel_sec = -78),
    ],
    "NOLANS" : [
        Candidate(0, "Zac Nolan", "Federalist Party", 2,
                prog_cons= -60,
                nat_glob= 30,
                env_eco= -5,
                soc_cap= 15,
                pac_mil= -10,
                auth_ana= -15,
                rel_sec = 85),
        Candidate(1, "Juliet Nolan", "The Greens", 2,
                prog_cons= -80,
                nat_glob= 65,
                env_eco= -95,
                soc_cap= -45,
                pac_mil= 0,
                auth_ana= 75,
                rel_sec = 95),
        Candidate(2, "Dale Nolan", "Status", 2,
                prog_cons= -12,
                nat_glob= -1,
                env_eco= -4,
                soc_cap= 62,
                pac_mil= 45,
                auth_ana= -12,
                rel_sec = 2),
    ]

}




os.system('cls' if os.name == 'nt' else 'clear') # clear and then ask 
for x in CAND_LIST.keys():
    print(x)
CHOICE = input("\nPick a party group from the list above: ")
CHOICE = difflib.get_close_matches(CHOICE.upper().strip(), CAND_LIST.keys(), 1)[0]
CANDIDATES = CAND_LIST[CHOICE] # SET CANDIDATE LIST TO USE
for m in range(len(CANDIDATES)):
    CANDIDATES[m].id = m





# ~~~~~~~~~~ MAIN ~~~~~~~~~~~~

RESULTS = []
not_voted = 0
for cand in CANDIDATES:
    RESULTS.append([cand, 0])

data = [ # create normal distributions for each value axis
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["prog_cons"], scale = 50, size=VOTING_DEMOS[COUNTRY]["pop"]), # prog - cons
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["nat_glob"], scale = 100, size=VOTING_DEMOS[COUNTRY]["pop"]), # nat - glob
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["env_eco"], scale = 150, size=VOTING_DEMOS[COUNTRY]["pop"]), # env - eco
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["soc_cap"], scale = 70, size=VOTING_DEMOS[COUNTRY]["pop"]), # soc - cap
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["pac_mil"], scale = 120, size=VOTING_DEMOS[COUNTRY]["pop"]), # pac - mil
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["auth_ana"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # auth - ana
    numpy.random.normal(loc = VOTING_DEMOS[COUNTRY]["vals"]["rel_sec"], scale = 160, size=VOTING_DEMOS[COUNTRY]["pop"]), # rel - sec
]



TIME = float(input("Delay : (0->50) ")) # seconds
DELAY = (TIME*5)/(math.sqrt(VOTING_DEMOS[COUNTRY]["pop"]))



# ~~~~~~~~~~ VOTING SYSTEMS ~~~~~~~~~

os.system('cls' if os.name == 'nt' else 'clear')
MODES = ["FPTP", "4 ROUND", "2 ROUND", "PROP REP"]
for x in MODES:
    print(x)

mode = difflib.get_close_matches(input("\nWhich voting system do you want to simulate? ").strip().upper(), MODES, 1)[0] 

if COUNTRY != CHOICE: # discard party popularity if not the relevant country
    for c in CANDIDATES:
        c.party_pop *= 0 


# running main program
results = run(data, CANDIDATES, VOTING_DEMOS[COUNTRY]['pop'])


if mode in ["4 ROUND", "2 ROUND"]:


    runoff_counter = 4 if len(CANDIDATES) > 4 else len(CANDIDATES)-1
    if mode == "2 ROUND":
        runoff_counter = 2

    while results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) < 0.5: # if nobody has a majority:

        # print plurality winner
        print(f"The {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")    
        print("No candidate has received a majority. The election will proceed to another round.")
        input()
        not_voted = 0 # reset not voted 


        # save old results as a dictionary
        old_results = {RESULTS[x][0] : RESULTS[x][1] for x in range(len(RESULTS))} 

        new_cands = [x[0] for x in results[:runoff_counter]] # knockout the lowest candidate
        for x in range(len(new_cands)): # reset candidate ids
            new_cands[x].id = x

        RESULTS = [] # reset RESULTS
        for cand in new_cands:
            RESULTS.append([cand, 0])


        results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop']) # run the elections again
        runoff_counter -= 1
        print_final_results(RESULTS, False, old_results)


    print(f"\nThe {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}%!")

elif mode in ["FPTP"]:

    for c in CANDIDATES:
        c.party_pop *= 3  # make party size 3 times more affecting for FPTP


    if results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) > 0.5: # if the leader has a majority:
        print(f"\nThe {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}%!")
    else: # if just plurality
        print(f"\nThe {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")
    
elif mode in ["PROP REP"]:


    if results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) > 0.5: # if the leader has a majority:
        print(f"\nThe {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won the election by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes) with a majority by a margin of {round((results[0][1]/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) - 0.5)*100, 2)}%!")
    else:  # FORM COALITION
        print(f"The {results[0][0].party} party {('(led by ' + results[0][0].name + ')') if (results[0][0].name!='') else ''} have won a plurality by a margin of {round((results[0][1]-results[1][1])/(VOTING_DEMOS[COUNTRY]['pop']-not_voted) * 100, 2)}% ({format_votes(results[0][1]-results[1][1])} votes)!")    
        print("No candidate has received a majority. A coalition will be formed.")

        input()
        leader, coal = coalition(results[0][0], RESULTS)
        if coal != []: # if a coalition was formed:
            print(f"\nThe {leader.party} party {('(led by ' + leader.name + ')') if (leader.name!='') else ''} have formed a coalition with:")
            for p in coal:
                print(f"> {p.party} {('(' + p.name + ')') if (p.name!='') else ''}")
            print(f"to form a majority government.")
        else:
            print(f"No parties could reach a coalition agreement.")
            
            try:
                hos = VOTING_DEMOS[COUNTRY]['hos']
            except KeyError:
                hos = "the Head of State"
            print(f"The goverment has been dissolved by {VOTING_DEMOS[COUNTRY]['hos']}. Run new elections.")
            exit()
        
            print("The election will proceed to a 2 round runoff.")
            input()

            not_voted = 0 # reset not voted 

            # save old results as a dictionary
            old_results = {RESULTS[x][0] : RESULTS[x][1] for x in range(len(RESULTS))} 

            new_cands = [x[0] for x in results[:2]] # knockout the lowest candidate
            for x in range(len(new_cands)): # reset candidate ids
                new_cands[x].id = x

            RESULTS = [] # reset RESULTS
            for cand in new_cands:
                RESULTS.append([cand, 0])


            results = run(data, new_cands, VOTING_DEMOS[COUNTRY]['pop']) # run the elections again
            print_final_results(RESULTS, False, old_results)